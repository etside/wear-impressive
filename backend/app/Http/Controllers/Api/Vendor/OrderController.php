<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Events\OrderCancelled;
use App\Events\OrderConfirmed;
use App\Events\OrderDelivered;
use App\Events\OrderShipped;
use App\Events\PaymentReceived;
use App\Helpers\OrderNumberGenerator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Orders\StoreOrderRequest;
use App\Http\Responses\ApiResponse;
use App\Models\BranchStock;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderFulfillment;
use App\Models\OrderItem;
use App\Models\OrderTimeline;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class OrderController extends Controller
{
    /**
     * GET /api/vendor/orders
     */
    public function index(Request $request): JsonResponse
    {
        $store = $request->store;

        $query = $store->orders()
            ->with(['customer:id,name,email,phone', 'items.product:id,name,featured_image', 'fulfillments']);

        // Filters
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($payment = $request->input('payment_status')) {
            $query->where('payment_status', $payment);
        }

        if ($fulfillment = $request->input('fulfillment_status')) {
            $query->where('fulfillment_status', $fulfillment);
        }

        if ($customerId = $request->input('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($method = $request->input('payment_method')) {
            $query->where('payment_method', $method);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_phone', 'like', "%{$search}%")
                    ->orWhere('guest_email', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($c) use ($search) {
                        $c->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return ApiResponse::success($orders);
    }

    /**
     * GET /api/vendor/orders/{order}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()
            ->with([
                'customer',
                'customerAddress',
                'items.product:id,name,featured_image,slug',
                'items.variant',
                'fulfillments',
                'timeline' => fn ($q) => $q->orderBy('created_at', 'desc'),
                'returnRequests',
            ])
            ->findOrFail($id);

        return ApiResponse::success($order);
    }

    /**
     * POST /api/vendor/orders
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $store = $request->store;
        $data = $request->validated();

        try {
            $order = DB::transaction(function () use ($store, $data, $request) {
                // Resolve products / variants and compute snapshots
                $snapshotItems = [];
                $subtotal = 0.0;

                foreach ($data['items'] as $line) {
                    /** @var Product $product */
                    $product = Product::where('store_id', $store->id)
                        ->where('id', $line['product_id'])
                        ->firstOrFail();

                    $variant = null;
                    if (! empty($line['variant_id'])) {
                        $variant = ProductVariant::where('product_id', $product->id)
                            ->where('id', $line['variant_id'])
                            ->firstOrFail();
                    }

                    $qty = (int) $line['quantity'];
                    $price = isset($line['price'])
                        ? (float) $line['price']
                        : (float) ($variant?->price ?? $product->price);
                    $discount = (float) ($line['discount'] ?? 0);
                    $lineSubtotal = round($price * $qty, 2);
                    $lineTotal = round($lineSubtotal - $discount, 2);

                    $snapshotItems[] = [
                        'product' => $product,
                        'variant' => $variant,
                        'product_name' => $product->name,
                        'variant_label' => $variant?->display_label,
                        'sku' => $variant?->sku ?: $product->sku,
                        'image' => $variant?->image ?: $product->featured_image,
                        'price' => $price,
                        'discount' => $discount,
                        'tax_rate' => (float) ($product->tax_rate ?? 0),
                        'quantity' => $qty,
                        'subtotal' => $lineSubtotal,
                        'total' => $lineTotal,
                    ];

                    $subtotal += $lineTotal;
                }

                $discountAmount = (float) ($data['discount_amount'] ?? 0);
                $shippingAmount = (float) ($data['shipping_amount'] ?? 0);
                $taxAmount = (float) ($data['tax_amount'] ?? 0);
                $total = round($subtotal - $discountAmount + $shippingAmount + $taxAmount, 2);

                // Create the order
                $order = Order::create([
                    'store_id' => $store->id,
                    'order_number' => OrderNumberGenerator::generate($store->id),
                    'customer_id' => $data['customer_id'] ?? null,
                    'customer_address_id' => $data['customer_address_id'] ?? null,
                    'branch_id' => $data['branch_id'] ?? null,
                    'guest_email' => $data['guest_email'] ?? null,
                    'guest_phone' => $data['guest_phone'] ?? null,
                    'guest_name' => $data['guest_name'] ?? null,
                    'status' => $data['status'] ?? 'pending',
                    'payment_status' => $data['payment_status'] ?? 'pending',
                    'fulfillment_status' => 'unfulfilled',
                    'subtotal' => round($subtotal, 2),
                    'discount_amount' => $discountAmount,
                    'shipping_amount' => $shippingAmount,
                    'tax_amount' => $taxAmount,
                    'total' => $total,
                    'currency' => $data['currency'] ?? 'BDT',
                    'payment_method' => $data['payment_method'] ?? null,
                    'payment_reference' => $data['payment_reference'] ?? null,
                    'coupon_code' => $data['coupon_code'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'internal_notes' => $data['internal_notes'] ?? null,
                    'shipping_address' => $data['shipping_address'] ?? null,
                    'billing_address' => $data['billing_address'] ?? null,
                    'metadata' => $data['metadata'] ?? null,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                // Create items + deduct stock + inventory log
                foreach ($snapshotItems as $item) {
                    /** @var Product $product */
                    $product = $item['product'];
                    /** @var ProductVariant|null $variant */
                    $variant = $item['variant'];
                    $qty = $item['quantity'];

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'variant_id' => $variant?->id,
                        'product_name' => $item['product_name'],
                        'variant_label' => $item['variant_label'],
                        'sku' => $item['sku'],
                        'image' => $item['image'],
                        'price' => $item['price'],
                        'cost_price_snapshot' => $variant?->cost_price ?? $product->cost_price,
                        'discount' => $item['discount'],
                        'tax_rate' => $item['tax_rate'],
                        'quantity' => $qty,
                        'quantity_fulfilled' => 0,
                        'quantity_returned' => 0,
                        'subtotal' => $item['subtotal'],
                        'total' => $item['total'],
                    ]);

                    if ($product->track_inventory) {
                        $this->deductStock(
                            store: $store,
                            product: $product,
                            variant: $variant,
                            qty: $qty,
                            order: $order,
                            request: $request
                        );
                    }
                }

                // Timeline entry
                $this->logTimeline(
                    $order,
                    'status_change',
                    'Order created',
                    'Manual order created with '.count($snapshotItems).' item(s).',
                    $request
                );

                return $order;
            });
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to create order: '.$e->getMessage(), 422);
        }

        $order->load(['items', 'customer', 'timeline']);

        return ApiResponse::success($order, 'Order created.', 201);
    }

    /**
     * PATCH /api/vendor/orders/{order}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $data = $request->validate([
            'notes' => ['sometimes', 'nullable', 'string'],
            'internal_notes' => ['sometimes', 'nullable', 'string'],
            'guest_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'guest_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'guest_phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_address' => ['sometimes', 'nullable', 'array'],
            'billing_address' => ['sometimes', 'nullable', 'array'],
            'metadata' => ['sometimes', 'nullable', 'array'],
            'tags' => ['sometimes', 'nullable', 'array'],
        ]);

        // Tags live in metadata if the column doesn't exist.
        if (array_key_exists('tags', $data)) {
            $metadata = $order->metadata ?? [];
            $metadata['tags'] = $data['tags'];
            $order->metadata = $metadata;
            unset($data['tags']);
        }

        $order->fill($data)->save();

        return ApiResponse::success($order->fresh(), 'Order updated.');
    }

    /**
     * POST /api/vendor/orders/{order}/cancel
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->with('items')->findOrFail($id);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($order->status === 'cancelled') {
            return ApiResponse::error('Order is already cancelled.', 422);
        }

        if (in_array($order->status, ['delivered', 'refunded', 'returned'], true)) {
            return ApiResponse::error('Cannot cancel an order in status: '.$order->status, 422);
        }

        DB::transaction(function () use ($order, $data, $request) {
            // Restore stock
            foreach ($order->items as $item) {
                $product = Product::find($item->product_id);
                if (! $product || ! $product->track_inventory) {
                    continue;
                }
                $variant = $item->variant_id ? ProductVariant::find($item->variant_id) : null;

                $this->restoreStock(
                    store: $request->store,
                    product: $product,
                    variant: $variant,
                    qty: (int) $item->quantity,
                    order: $order,
                    request: $request,
                    note: 'Order cancelled'
                );
            }

            $order->status = 'cancelled';
            $order->cancelled_at = now();
            $order->cancelled_reason = $data['reason'];

            // Refund-due amount = whatever the customer actually paid via the
            // manual gateway. The COD remainder was never collected, so we
            // never owe the customer for it. Stamp it on metadata so the
            // dashboard can prompt the vendor with "refund X to customer".
            $advance = (float) ($order->advance_amount ?? 0);
            $refundDue = ($advance > 0 && $order->payment_reference) ? round($advance, 2) : 0.0;

            $metadata = $order->metadata ?? [];
            $metadata['refund_due_amount'] = $refundDue;
            $metadata['refund_due_currency'] = $order->currency ?? 'BDT';
            $metadata['refund_status'] = $refundDue > 0 ? 'pending' : 'not_required';
            $order->metadata = $metadata;
            $order->save();

            $this->logTimeline(
                $order,
                'status_change',
                'Order cancelled',
                $refundDue > 0
                    ? sprintf('%s — Refund %s %s due to customer.', $data['reason'], $order->currency ?? 'BDT', number_format($refundDue, 2))
                    : $data['reason'],
                $request
            );
        });

        event(new OrderCancelled($order->fresh(), $data['reason']));

        return ApiResponse::success($order->fresh(), 'Order cancelled.');
    }

    /**
     * POST /api/vendor/orders/{order}/pack
     */
    public function markAsPacked(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $order->status = 'packed';
        $order->save();

        $this->logTimeline($order, 'status_change', 'Order packed', null, $request);

        return ApiResponse::success($order->fresh(), 'Order marked as packed.');
    }

    /**
     * POST /api/vendor/orders/{order}/ship
     */
    public function markAsShipped(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $data = $request->validate([
            'carrier' => ['required', Rule::in(['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly', 'self', 'other'])],
            // Tracking number is optional — self-delivery orders don't have one.
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'string', 'max:500'],
            // Date the parcel was actually handed to the courier. Defaults
            // to "now" if not provided so the existing UI keeps working.
            'shipped_at' => ['nullable', 'date'],
            // Optional override for the auto-derived ETA. When omitted we
            // calculate it from the chosen shipping zone's
            // delivery_estimate string (snapshotted on order metadata at
            // checkout time), so the vendor never has to type it.
            'estimated_delivery' => ['nullable', 'date'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'cod_amount' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $shippedAt = !empty($data['shipped_at'])
            ? \Carbon\Carbon::parse($data['shipped_at'])
            : now();

        // Derive ETA from the order's frozen shipping_estimate (e.g.
        // "1-2 business days" → +2 days from ship date). The vendor's
        // explicit `estimated_delivery` always wins if they sent one.
        $estimatedDelivery = $data['estimated_delivery'] ?? null;
        if (! $estimatedDelivery) {
            $meta = (array) ($order->metadata ?? []);
            $estimateStr = $meta['shipping_estimate'] ?? null;
            $maxDays = $this->parseDeliveryEstimateDays($estimateStr);
            if ($maxDays !== null && $maxDays > 0) {
                $estimatedDelivery = $shippedAt->copy()->addDays($maxDays)->toDateString();
            }
        }

        $fulfillment = DB::transaction(function () use ($order, $data, $request, $shippedAt, $estimatedDelivery) {
            $fulfillment = OrderFulfillment::create([
                'order_id' => $order->id,
                'carrier' => $data['carrier'],
                'tracking_number' => $data['tracking_number'] ?? null,
                'tracking_url' => $data['tracking_url'] ?? null,
                'estimated_delivery' => $estimatedDelivery,
                'shipping_cost' => $data['shipping_cost'] ?? null,
                'cod_amount' => $data['cod_amount'] ?? 0,
                'weight' => $data['weight'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'shipped',
                'shipped_at' => $shippedAt,
            ]);

            $order->status = 'shipped';
            $order->fulfillment_status = 'fulfilled';
            $order->save();

            $this->logTimeline(
                $order,
                'fulfillment',
                'Order shipped',
                'Via '.$data['carrier'].' (tracking: '.$data['tracking_number'].')',
                $request
            );

            return $fulfillment;
        });

        event(new OrderShipped($order->fresh(), $fulfillment));

        return ApiResponse::success($order->fresh(['fulfillments']), 'Order marked as shipped.');
    }

    /**
     * POST /api/vendor/orders/{order}/deliver
     */
    public function markAsDelivered(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $order->status = 'delivered';
        $order->fulfillment_status = 'fulfilled';
        $order->save();

        // Mark latest fulfillment as delivered
        $latest = $order->fulfillments()->latest('id')->first();
        if ($latest) {
            $latest->status = 'delivered';
            $latest->delivered_at = now();
            $latest->save();
        }

        $this->logTimeline($order, 'status_change', 'Order delivered', null, $request);

        event(new OrderDelivered($order->fresh()));

        return ApiResponse::success($order->fresh(['fulfillments']), 'Order marked as delivered.');
    }

    /**
     * POST /api/vendor/orders/{order}/mark-paid
     */
    public function markAsPaid(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $data = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['bkash', 'nagad', 'sslcommerz', 'cod', 'stripe', 'cash', 'card', 'other'])],
            'payment_reference' => ['nullable', 'string', 'max:255'],
        ]);

        $total = (float) $order->total;
        $alreadyPaid = (float) ($order->amount_paid ?? 0);
        $recording = isset($data['amount']) ? (float) $data['amount'] : ($total - $alreadyPaid);
        $newPaid = round($alreadyPaid + $recording, 2);

        $order->amount_paid = $newPaid;
        $order->payment_status = $newPaid + 0.01 >= $total ? 'paid' : 'partial';
        $order->payment_method = $data['payment_method'];
        $order->payment_reference = $data['payment_reference'] ?? $order->payment_reference;
        $order->save();

        $this->logTimeline(
            $order,
            'payment',
            'Payment received',
            'Amount: ৳'.number_format($recording, 2).' · Method: '.$data['payment_method'],
            $request
        );

        event(new PaymentReceived($order->fresh()));

        return ApiResponse::success($order->fresh(), 'Order marked as paid.');
    }

    /**
     * POST /api/vendor/orders/{order}/verify-advance
     *
     * Vendor confirms the advance portion of a manual-payment order has
     * landed (typically after they cross-checked the customer's screenshot
     * + transaction id against their bKash/Nagad app). We bump amount_paid
     * up to advance_amount and flip payment_status to 'partial' (or 'paid'
     * if there's no COD remainder). The order *status* stays where it is —
     * the vendor advances that separately via Confirm/Ship/Deliver.
     */
    public function verifyAdvance(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $advance = (float) ($order->advance_amount ?? 0);
        if ($advance <= 0) {
            return ApiResponse::error('This order has no advance amount to verify.', 422);
        }

        $alreadyPaid = (float) ($order->amount_paid ?? 0);
        if ($alreadyPaid + 0.01 >= $advance) {
            return ApiResponse::error('Advance is already verified.', 422);
        }

        $cod = (float) ($order->cod_amount ?? 0);

        $order->amount_paid = $advance;
        $order->payment_status = $cod > 0.01 ? 'partial' : 'paid';

        // Verifying the advance is the vendor's signal that the order is
        // ready to ship — auto-flip the status from pending to confirmed
        // so they don't have to click two buttons. This is purely a UX
        // collapse; pending orders that need a separate confirm step (e.g.
        // wholesale review) can override by calling /confirm explicitly.
        $autoConfirmed = false;
        if ($order->status === 'pending') {
            $order->status = 'confirmed';
            $autoConfirmed = true;
        }
        $order->save();

        $this->logTimeline(
            $order,
            'payment',
            'Advance verified' . ($autoConfirmed ? ' & order confirmed' : ''),
            sprintf('%s %s received as advance', $order->currency ?? 'BDT', number_format($advance, 2)),
            $request
        );

        if ($autoConfirmed) {
            event(new OrderConfirmed($order->fresh()));
        }

        return ApiResponse::success($order->fresh(), 'Advance payment verified.');
    }

    /**
     * POST /api/vendor/orders/{order}/collect-cod
     *
     * Records the cash-on-delivery collection. Tops amount_paid up to the
     * full total and flips payment_status to 'paid'. Typically called
     * right after the courier returns confirmation, or paired with the
     * Mark Delivered action.
     */
    public function collectCod(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $alreadyPaid = (float) ($order->amount_paid ?? 0);
        $total = (float) $order->total;
        if ($alreadyPaid + 0.01 >= $total) {
            return ApiResponse::error('Order is already fully paid.', 422);
        }

        $delta = round($total - $alreadyPaid, 2);
        $order->amount_paid = $total;
        $order->payment_status = 'paid';
        $order->save();

        $this->logTimeline(
            $order,
            'payment',
            'COD collected',
            sprintf('%s %s collected at delivery (balance settled)', $order->currency ?? 'BDT', number_format($delta, 2)),
            $request
        );

        event(new PaymentReceived($order->fresh()));

        return ApiResponse::success($order->fresh(), 'COD payment recorded.');
    }

    /**
     * POST /api/vendor/orders/{order}/confirm
     *
     * Manual confirmation step — flips a pending order to 'confirmed' so
     * the vendor's queue separates "needs review" from "ready to ship".
     * Doesn't require payment to be settled (vendors who pre-pack and
     * settle later are common in BD direct-ship).
     */
    public function markAsConfirmed(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        if (in_array($order->status, ['cancelled', 'refunded', 'returned'], true)) {
            return ApiResponse::error('Cannot confirm a closed order.', 422);
        }

        // Confirm-and-verify in one shot: if there's a pending advance to
        // settle, do it as part of the same action — saves the vendor from
        // clicking two buttons that semantically mean "I checked, this is
        // good to go". The amount + payment_status update is identical to
        // verifyAdvance() so reports stay consistent.
        $advance = (float) ($order->advance_amount ?? 0);
        $alreadyPaid = (float) ($order->amount_paid ?? 0);
        $advanceVerified = false;
        if ($advance > 0 && $alreadyPaid + 0.01 < $advance) {
            $cod = (float) ($order->cod_amount ?? 0);
            $order->amount_paid = $advance;
            $order->payment_status = $cod > 0.01 ? 'partial' : 'paid';
            $advanceVerified = true;
        }

        $wasConfirmed = $order->status === 'confirmed';
        $order->status = 'confirmed';
        $order->save();

        $this->logTimeline(
            $order,
            'status_change',
            $advanceVerified ? 'Order confirmed & advance verified' : 'Order confirmed',
            $advanceVerified
                ? sprintf('%s %s received as advance', $order->currency ?? 'BDT', number_format($advance, 2))
                : null,
            $request
        );

        // SMS only on the first confirm — a re-click must not re-text the customer.
        if (! $wasConfirmed) {
            event(new OrderConfirmed($order->fresh()));
        }

        return ApiResponse::success($order->fresh(), 'Order confirmed.');
    }

    /**
     * POST /api/vendor/orders/{order}/notes
     */
    public function addNote(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'is_internal' => ['sometimes', 'boolean'],
        ]);

        $entry = $this->logTimeline(
            $order,
            'note',
            $data['is_internal'] ?? false ? 'Internal note' : 'Note',
            $data['content'],
            $request,
            ['is_internal' => (bool) ($data['is_internal'] ?? false)]
        );

        return ApiResponse::success($entry, 'Note added.', 201);
    }

    /**
     * GET /api/vendor/orders/{order}/timeline
     */
    public function timeline(Request $request, string $id): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($id);

        $entries = $order->timeline()->orderBy('created_at', 'desc')->get();

        return ApiResponse::success($entries);
    }

    /**
     * POST /api/vendor/orders/bulk-action
     */
    public function bulkAction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['cancel', 'mark_paid', 'mark_shipped', 'mark_packed', 'mark_delivered'])],
            'order_ids' => ['required', 'array', 'min:1'],
            'order_ids.*' => ['integer'],
            'reason' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['nullable', 'string'],
            'carrier' => ['nullable', 'string'],
            'tracking_number' => ['nullable', 'string'],
        ]);

        $store = $request->store;
        $orders = $store->orders()->whereIn('id', $data['order_ids'])->get();

        $processed = 0;
        $failed = [];

        foreach ($orders as $order) {
            try {
                $firedEvent = null;
                DB::transaction(function () use ($order, $data, $request, &$firedEvent) {
                    switch ($data['action']) {
                        case 'cancel':
                            if (in_array($order->status, ['cancelled', 'delivered', 'refunded', 'returned'], true)) {
                                throw new \RuntimeException('Cannot cancel order in status: '.$order->status);
                            }
                            $order->loadMissing('items');
                            foreach ($order->items as $item) {
                                $product = Product::find($item->product_id);
                                if (! $product || ! $product->track_inventory) {
                                    continue;
                                }
                                $variant = $item->variant_id ? ProductVariant::find($item->variant_id) : null;
                                $this->restoreStock(
                                    store: $request->store,
                                    product: $product,
                                    variant: $variant,
                                    qty: (int) $item->quantity,
                                    order: $order,
                                    request: $request,
                                    note: 'Bulk cancel'
                                );
                            }
                            $order->status = 'cancelled';
                            $order->cancelled_at = now();
                            $order->cancelled_reason = $data['reason'] ?? 'Bulk cancel';
                            $order->save();
                            $this->logTimeline($order, 'status_change', 'Order cancelled', $order->cancelled_reason, $request);
                            $firedEvent = new OrderCancelled($order, $order->cancelled_reason);
                            break;

                        case 'mark_paid':
                            $order->payment_status = 'paid';
                            if (! empty($data['payment_method'])) {
                                $order->payment_method = $data['payment_method'];
                            }
                            $order->save();
                            $this->logTimeline($order, 'payment', 'Payment received (bulk)', null, $request);
                            $firedEvent = new PaymentReceived($order);
                            break;

                        case 'mark_packed':
                            $order->status = 'packed';
                            $order->save();
                            $this->logTimeline($order, 'status_change', 'Order packed (bulk)', null, $request);
                            break;

                        case 'mark_shipped':
                            $order->status = 'shipped';
                            $order->fulfillment_status = 'fulfilled';
                            $order->save();
                            $this->logTimeline($order, 'fulfillment', 'Order shipped (bulk)', null, $request);
                            $firedEvent = new OrderShipped($order);
                            break;

                        case 'mark_delivered':
                            $order->status = 'delivered';
                            $order->fulfillment_status = 'fulfilled';
                            $order->save();
                            $this->logTimeline($order, 'status_change', 'Order delivered (bulk)', null, $request);
                            $firedEvent = new OrderDelivered($order);
                            break;
                    }
                });
                if ($firedEvent) {
                    event($firedEvent);
                }
                $processed++;
            } catch (\Throwable $e) {
                $failed[] = ['order_id' => $order->id, 'error' => $e->getMessage()];
            }
        }

        return ApiResponse::success([
            'processed' => $processed,
            'failed' => $failed,
        ], 'Bulk action complete.');
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    protected function deductStock($store, Product $product, ?ProductVariant $variant, int $qty, Order $order, Request $request): void
    {
        $branchId = $order->branch_id;

        // Branch-level stock
        if ($branchId) {
            $stock = BranchStock::firstOrCreate([
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
            ], [
                'stock' => 0,
                'low_stock_threshold' => 5,
            ]);

            $before = (int) $stock->stock;
            $after = $before - $qty;
            $stock->stock = $after;
            $stock->save();

            $this->logInventory(
                $store->id,
                $branchId,
                $product,
                $variant,
                changeQty: -$qty,
                beforeQty: $before,
                afterQty: $after,
                type: 'sale',
                order: $order,
                request: $request
            );
        } else {
            // No branch on the order — still log an inventory movement against product/variant totals.
            $before = (int) ($variant?->stock ?? $product->stock);
            $after = $before - $qty;

            $this->logInventory(
                $store->id,
                null,
                $product,
                $variant,
                changeQty: -$qty,
                beforeQty: $before,
                afterQty: $after,
                type: 'sale',
                order: $order,
                request: $request
            );
        }

        // Product / variant totals
        if ($variant) {
            $variant->decrement('stock', $qty);
        } else {
            $product->decrement('stock', $qty);
        }
    }

    protected function restoreStock($store, Product $product, ?ProductVariant $variant, int $qty, Order $order, Request $request, string $note = 'Stock restored'): void
    {
        $branchId = $order->branch_id;

        if ($branchId) {
            $stock = BranchStock::firstOrCreate([
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
            ], [
                'stock' => 0,
                'low_stock_threshold' => 5,
            ]);

            $before = (int) $stock->stock;
            $after = $before + $qty;
            $stock->stock = $after;
            $stock->save();

            $this->logInventory(
                $store->id,
                $branchId,
                $product,
                $variant,
                changeQty: $qty,
                beforeQty: $before,
                afterQty: $after,
                type: 'return',
                order: $order,
                request: $request,
                note: $note
            );
        } else {
            $before = (int) ($variant?->stock ?? $product->stock);
            $after = $before + $qty;

            $this->logInventory(
                $store->id,
                null,
                $product,
                $variant,
                changeQty: $qty,
                beforeQty: $before,
                afterQty: $after,
                type: 'return',
                order: $order,
                request: $request,
                note: $note
            );
        }

        if ($variant) {
            $variant->increment('stock', $qty);
        } else {
            $product->increment('stock', $qty);
        }
    }

    protected function logInventory(
        int $storeId,
        ?int $branchId,
        Product $product,
        ?ProductVariant $variant,
        int $changeQty,
        int $beforeQty,
        int $afterQty,
        string $type,
        Order $order,
        Request $request,
        ?string $note = null,
    ): void {
        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : 'system');

        InventoryLog::create([
            'store_id' => $storeId,
            'branch_id' => $branchId,
            'product_id' => $product->id,
            'variant_id' => $variant?->id,
            'type' => $type,
            'change_qty' => $changeQty,
            'before_qty' => $beforeQty,
            'after_qty' => $afterQty,
            'reference_type' => Order::class,
            'reference_id' => $order->id,
            'user_type' => $userType,
            'user_id' => $user?->id,
            'note' => $note,
        ]);
    }

    protected function logTimeline(
        Order $order,
        string $eventType,
        string $title,
        ?string $description,
        Request $request,
        array $metadata = [],
    ): OrderTimeline {
        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : null);

        return OrderTimeline::create([
            'order_id' => $order->id,
            'event_type' => $eventType,
            'title' => $title,
            'description' => $description,
            'user_type' => $userType,
            'user_id' => $user?->id,
            'metadata' => ! empty($metadata) ? $metadata : null,
        ]);
    }

    /**
     * Parse the *max* number of days from a delivery-estimate string like
     * "1-2 business days", "2 days", "৩-৫ কার্যদিবস", or "Same day".
     * Returns null when no number can be extracted (caller falls back to
     * not setting an ETA).
     *
     * Accepts both English (0-9) and Bangla (০-৯) digits, and either ASCII
     * "-" or Unicode en-dash "–" as the range separator.
     */
    protected function parseDeliveryEstimateDays(?string $estimate): ?int
    {
        if (! $estimate) return null;

        // Normalise Bangla digits to ASCII so the regex below covers both.
        $bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
        $en = ['0','1','2','3','4','5','6','7','8','9'];
        $normalized = str_replace($bn, $en, $estimate);

        // "Same day" / "today" → 0 days = ETA is the ship date itself.
        if (preg_match('/\b(same\s*day|today|আজ)\b/iu', $normalized)) {
            return 0;
        }

        // Match "1-2", "1–2", "1 to 2", etc. Take the larger number.
        if (preg_match('/(\d+)\s*[-–to]+\s*(\d+)/u', $normalized, $m)) {
            return max((int) $m[1], (int) $m[2]);
        }

        // Single number ("2 days").
        if (preg_match('/(\d+)/u', $normalized, $m)) {
            return (int) $m[1];
        }

        return null;
    }
}
