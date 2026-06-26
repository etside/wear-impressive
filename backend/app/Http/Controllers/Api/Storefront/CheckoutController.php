<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Events\OrderPlaced;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\PlaceOrderRequest;
use App\Http\Responses\ApiResponse;
use App\Models\BranchStock;
use App\Models\CartCoupon;
use App\Models\CartItem;
use App\Models\CustomerAddress;
use App\Models\Discount;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTimeline;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use App\Models\Store;
use App\Services\Payments\AdvancePolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @group Storefront (Public)
 */
class CheckoutController extends Controller
{
    /**
     * POST /api/store/checkout/calculate
     */
    public function calculate(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $validated = $request->validate([
            'cart_items' => ['nullable', 'array'],
            'cart_items.*.product_id' => ['required_with:cart_items', 'integer'],
            'cart_items.*.variant_id' => ['nullable', 'integer'],
            'cart_items.*.quantity' => ['required_with:cart_items', 'integer', 'min:1'],
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.district' => ['nullable', 'string'],
            'shipping_address.thana' => ['nullable', 'string'],
            'shipping_rate_id' => ['nullable', 'integer'],
            'payment_method' => ['nullable', 'string'],
            'coupon_code' => ['nullable', 'string'],
            'cart_token' => ['nullable', 'string'],
        ]);

        $items = $this->resolveItems($request, $store, $validated['cart_items'] ?? null);
        if (empty($items)) {
            return ApiResponse::error('Cart is empty.', 422);
        }

        $subtotal = array_sum(array_map(fn ($i) => $i['line_total'], $items));

        $district = $validated['shipping_address']['district'] ?? null;
        $shippingFee = $this->resolveShippingFee(
            $store,
            $validated['shipping_rate_id'] ?? null,
            $district,
            (float) $subtotal,
        );

        $couponCode = $validated['coupon_code'] ?? $this->currentCouponCode($request, $store);
        $discount = $this->resolveCouponDiscount($store, $couponCode, (float) $subtotal);

        $tax = 0.0;
        $total = max(0, $subtotal - $discount) + $shippingFee + $tax;

        $shippingRates = $this->availableShippingRates($store, $district, (float) $subtotal);
        $paymentMethods = $this->availablePaymentMethods($store);

        // Advance/COD split — applies when manual gateway is selected. For
        // online gateways this returns advance=total, cod=0; for COD it
        // returns advance=0, cod=total. The frontend uses these to render the
        // breakdown and update the place-order button text.
        $advancePolicy = app(AdvancePolicyService::class);
        $split = $advancePolicy->compute(
            $store,
            (float) $subtotal,
            (float) $discount,
            (float) $shippingFee,
            (float) $total,
            $validated['payment_method'] ?? null,
        );
        $policyConfig = $advancePolicy->loadConfig($store->id);

        return ApiResponse::success([
            'subtotal' => (string) round((float) $subtotal, 2),
            'discount_amount' => (string) round($discount, 2),
            'shipping_amount' => (string) round($shippingFee, 2),
            'tax_amount' => (string) round($tax, 2),
            'total' => (string) round($total, 2),
            'advance_amount' => (string) round($split['advance'], 2),
            'cod_amount' => (string) round($split['cod'], 2),
            'advance_mode' => $split['mode'],
            'advance_policy' => $policyConfig,
            'currency' => $store->currency ?? 'BDT',
            'coupon_code' => $couponCode,
            'items' => $items,
            'available_shipping_rates' => $shippingRates,
            'available_payment_methods' => $paymentMethods,
        ], 'Checkout calculated.');
    }

    /**
     * POST /api/store/checkout/place
     */
    public function place(PlaceOrderRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $data = $request->validated();
        $customer = auth('customer')->user();

        // Resolve order items — either from payload or from stored cart.
        $payloadItems = $data['items'] ?? null;
        $items = $this->resolveItems($request, $store, $payloadItems);

        if (empty($items)) {
            return ApiResponse::error('Cart is empty.', 422);
        }

        // Resolve shipping address.
        $shippingAddress = $data['shipping_address'] ?? [];
        if ($customer && ! empty($data['shipping_address_id'])) {
            $saved = CustomerAddress::query()
                ->where('customer_id', $customer->id)
                ->find($data['shipping_address_id']);

            if (! $saved) {
                return ApiResponse::error('Shipping address not found.', 404);
            }

            $shippingAddress = [
                'full_name' => $saved->full_name,
                'phone' => $saved->phone,
                'address_line_1' => $saved->address_line_1,
                'address_line_2' => $saved->address_line_2,
                'division' => $saved->division,
                'district' => $saved->district,
                'thana' => $saved->thana,
                'area' => $saved->area,
                'postal_code' => $saved->postal_code,
            ];
        }

        if (empty($shippingAddress)) {
            return ApiResponse::error('Shipping address is required.', 422);
        }

        // Phone is mandatory for COD guest orders regardless of vendor field config.
        // Without a phone, courier cannot reach the customer for delivery.
        $guestPhone = $data['phone'] ?? $shippingAddress['phone'] ?? null;
        $method = strtolower((string) ($data['payment_method'] ?? ''));
        if (! auth('customer')->check() && in_array($method, ['cod', 'cash'], true) && empty($guestPhone)) {
            return ApiResponse::error('Phone number is required for Cash on Delivery orders.', 422);
        }

        $subtotal = array_sum(array_map(fn ($i) => $i['line_total'], $items));
        $shippingFee = $this->resolveShippingFee(
            $store,
            $data['shipping_rate_id'] ?? null,
            $shippingAddress['district'] ?? null,
            (float) $subtotal,
        );

        // Snapshot the chosen zone's delivery estimate so the vendor's
        // order page can default the ETA to "ship date + N days" without
        // having to look the zone up again. Stored on metadata since the
        // orders table doesn't have a shipping_zone_id column.
        $chosenZone = $data['shipping_rate_id']
            ? ShippingZone::query()
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->find($data['shipping_rate_id'])
            : null;

        $couponCode = $data['coupon_code'] ?? $this->currentCouponCode($request, $store);
        $discountAmount = $this->resolveCouponDiscount($store, $couponCode, (float) $subtotal);

        $tax = 0.0;
        $total = max(0, $subtotal - $discountAmount) + $shippingFee + $tax;

        // Freeze the advance/COD split at order time so reports stay correct
        // even if the vendor's policy changes later. The same service is used
        // by /calculate so the customer's quoted breakdown matches what we
        // actually persist.
        $advancePolicy = app(AdvancePolicyService::class);

        // Block COD when the vendor's advance policy is active — letting the
        // customer pick COD would sidestep the advance entirely.
        $advConfig = $advancePolicy->loadConfig($store->id);
        $pm = strtolower((string) ($data['payment_method'] ?? ''));
        if ($advConfig['mode'] !== 'none' && in_array($pm, ['cod', 'cash'], true)) {
            return ApiResponse::error('Cash on Delivery is not available. Please pay via bKash/Nagad/Rocket.', 422);
        }

        $split = $advancePolicy->compute(
            $store,
            (float) $subtotal,
            (float) $discountAmount,
            (float) $shippingFee,
            (float) $total,
            $data['payment_method'] ?? null,
        );

        try {
            $order = DB::transaction(function () use (
                $store, $customer, $data, $items, $shippingAddress,
                $subtotal, $discountAmount, $shippingFee, $tax, $total, $split, $couponCode, $request, $chosenZone
            ) {
                $metadata = [];
                if (($data['payment_method'] ?? null) === 'manual') {
                    $metadata['payment_proof_url'] = $data['payment_proof_url'] ?? null;
                    $metadata['payment_wallet'] = $data['payment_wallet'] ?? null;
                    $metadata['advance_mode'] = $split['mode'];
                }
                // Frozen shipping zone snapshot — used by the dashboard to
                // suggest an ETA from the zone's delivery_estimate string
                // when the vendor marks the order as sent.
                if ($chosenZone) {
                    $metadata['shipping_zone_id'] = $chosenZone->id;
                    $metadata['shipping_zone_name'] = $chosenZone->name;
                    $metadata['shipping_estimate'] = $chosenZone->delivery_estimate;
                    $metadata['shipping_estimate_bn'] = $chosenZone->delivery_estimate_bn;
                }

                $order = Order::create([
                    'store_id' => $store->id,
                    'order_number' => $this->generateOrderNumber($store->id),
                    'customer_id' => $customer?->id,
                    'customer_address_id' => $data['shipping_address_id'] ?? null,
                    'guest_email' => $customer ? null : ($data['email'] ?? null),
                    'guest_phone' => $customer ? null : ($data['phone'] ?? null),
                    'guest_name' => $customer ? null : ($data['name'] ?? null),
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'fulfillment_status' => 'unfulfilled',
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'shipping_amount' => $shippingFee,
                    'tax_amount' => $tax,
                    'total' => $total,
                    'advance_amount' => $split['advance'],
                    'cod_amount' => $split['cod'],
                    'currency' => $store->currency ?? 'BDT',
                    'payment_method' => $data['payment_method'],
                    'payment_reference' => $data['payment_reference'] ?? null,
                    'coupon_code' => $couponCode,
                    'notes' => $data['notes'] ?? null,
                    'shipping_address' => $shippingAddress,
                    'billing_address' => $shippingAddress,
                    'metadata' => $metadata ?: null,
                    'ip_address' => $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                ]);

                // Create items + deduct stock. Bundles get a parent
                // OrderItem (carries the bundle price) plus N child rows
                // (carry the chosen-variant identity, zero price). Stock
                // is decremented on the children, not the bundle row.
                foreach ($items as $item) {
                    $product = Product::find($item['product_id']);
                    $variant = $item['variant_id'] ? ProductVariant::find($item['variant_id']) : null;

                    $parentOrderItem = OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'variant_id' => $variant?->id,
                        'parent_order_item_id' => null,
                        'product_name' => $product->name,
                        'variant_label' => $variant?->display_label,
                        'sku' => $variant?->sku ?? $product->sku,
                        'image' => $product->featured_image,
                        'price' => $item['price'],
                        'cost_price_snapshot' => $variant?->cost_price ?? $product->cost_price,
                        'discount' => 0,
                        'tax_rate' => 0,
                        'quantity' => $item['quantity'],
                        'subtotal' => $item['line_total'],
                        'total' => $item['line_total'],
                    ]);

                    if (! empty($item['is_bundle'])) {
                        // Bundle: emit child rows + decrement stock on each.
                        foreach ($item['components'] as $comp) {
                            $compProduct = Product::find($comp['product_id']);
                            $compVariant = $comp['variant_id'] ? ProductVariant::find($comp['variant_id']) : null;
                            if (! $compProduct) {
                                continue;
                            }

                            OrderItem::create([
                                'order_id' => $order->id,
                                'product_id' => $compProduct->id,
                                'variant_id' => $compVariant?->id,
                                'parent_order_item_id' => $parentOrderItem->id,
                                'product_name' => $compProduct->name,
                                'variant_label' => $compVariant?->display_label,
                                'sku' => $compVariant?->sku ?? $compProduct->sku,
                                'image' => $compProduct->featured_image,
                                // Children carry zero so totals stay on parent.
                                'price' => 0,
                                'cost_price_snapshot' => $compVariant?->cost_price ?? $compProduct->cost_price,
                                'discount' => 0,
                                'tax_rate' => 0,
                                'quantity' => $comp['quantity'],
                                'subtotal' => 0,
                                'total' => 0,
                            ]);

                            $this->decrementStock($store, $order, $compProduct, $compVariant, (int) $comp['quantity']);
                        }
                        // No stock decrement on the bundle product itself.
                        continue;
                    }

                    // Simple item: existing behavior.
                    $this->decrementStock($store, $order, $product, $variant, (int) $item['quantity']);
                }

                // Order timeline entry.
                OrderTimeline::create([
                    'order_id' => $order->id,
                    'event_type' => 'status_change',
                    'title' => 'Order placed',
                    'description' => 'Order placed via storefront.',
                    'user_type' => $customer ? 'customer' : 'system',
                    'user_id' => $customer?->id,
                ]);

                // Clear cart.
                $this->clearCartForRequest($request, $store, $customer?->id);

                // Increment discount usage.
                if ($couponCode) {
                    Discount::query()
                        ->where('store_id', $store->id)
                        ->where('code', $couponCode)
                        ->increment('used_count');
                }

                return $order->load('items');
            });
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to place order: '.$e->getMessage(), 500);
        }

        event(new OrderPlaced($order));

        // Branch on payment method.
        // Online BD gateways are settled in a second step via /api/store/payment/initiate/{order}
        // so the frontend can redirect the customer.
        $method = strtolower((string) ($data['payment_method'] ?? ''));

        if (in_array($method, ['sslcommerz', 'bkash', 'nagad'], true)) {
            return ApiResponse::success([
                'order_id'         => $order->id,
                'order_number'     => $order->order_number,
                'requires_payment' => true,
                'payment_method'   => $method,
            ], 'Order placed. Awaiting payment.', 201);
        }

        // COD / cash flow: stays pending until delivered.
        if ($method === 'cod' || $method === 'cash') {
            $order->payment_status = 'pending';
            $order->save();
        } elseif ($method === 'other' || $method === 'card' || $method === 'manual') {
            // Manual mobile-banking (bKash/Nagad/Rocket send-money): customer has
            // submitted a txn ID + screenshot; vendor verifies from the dashboard
            // before flipping payment_status to 'paid'.
            $order->payment_status = $order->total <= 0 ? 'paid' : 'pending';
            $order->save();
        }

        return ApiResponse::success([
            'order'            => $order,
            'order_id'         => $order->id,
            'order_number'     => $order->order_number,
            'requires_payment' => false,
            'payment_method'   => $method,
        ], 'Order placed.', 201);
    }

    /**
     * POST /api/store/checkout/upload-proof
     *
     * Accepts a screenshot for manual (bKash/Nagad/Rocket) payments and returns
     * a publicly-accessible URL. Vendors verify the proof from the dashboard.
     */
    public function uploadProof(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $request->validate([
            'file' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $path = $request->file('file')->store("stores/{$store->id}/payment-proofs", 'public');
        $url = Storage::disk('public')->url($path);

        return ApiResponse::success([
            'path' => $path,
            'url'  => $url,
        ], 'Proof uploaded.');
    }

    /**
     * Resolve items for the cart or payload.
     *
     * @return array<int,array{product_id:int,variant_id:?int,quantity:int,price:float,line_total:float,product_name:string}>
     */
    protected function resolveItems(Request $request, Store $store, ?array $payloadItems): array
    {
        $result = [];

        if (is_array($payloadItems) && ! empty($payloadItems)) {
            // Direct payload path (Buy Now / single-item checkout). Bundles
            // can't be passed via this path in v1 — they always come from
            // the cart so the children are already pre-staged.
            foreach ($payloadItems as $raw) {
                $product = Product::query()
                    ->where('store_id', $store->id)
                    ->where('status', 'active')
                    ->find((int) $raw['product_id']);

                if (! $product || $product->isBundle()) {
                    // Bundles must be added via cart first (components need staging).
                    if ($product?->isBundle()) {
                        throw new \RuntimeException('Bundle products cannot be purchased via the buy-now path. Please add to cart first.');
                    }
                    continue;
                }

                $variant = null;
                if (! empty($raw['variant_id'])) {
                    $variant = ProductVariant::query()
                        ->where('product_id', $product->id)
                        ->where('is_active', true)
                        ->find((int) $raw['variant_id']);
                }

                $price = $this->effectivePrice($product, $variant);
                $qty = max(1, (int) ($raw['quantity'] ?? 1));

                $result[] = [
                    'is_bundle' => false,
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                    'quantity' => $qty,
                    'price' => $price,
                    'line_total' => $price * $qty,
                    'product_name' => $product->name,
                    'components' => [],
                ];
            }

            return $result;
        }

        // Cart-driven path. Pull only top-level rows so bundle children
        // don't show up as separate line items, then walk into each
        // bundle parent's children below.
        $customerId = auth('customer')->id();
        $cartToken = $request->header('X-Cart-Token')
            ?? $request->query('cart_token')
            ?? $request->input('cart_token');

        $cartItems = CartItem::query()
            ->where('store_id', $store->id)
            ->whereNull('parent_cart_item_id')
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->with(['product', 'variant', 'children.product', 'children.variant'])
            ->get();

        foreach ($cartItems as $ci) {
            $product = $ci->product;
            if (! $product || $product->status !== 'active') {
                continue;
            }

            $qty = max(1, (int) $ci->quantity);

            if ($product->isBundle()) {
                // Bundle: trust the snapshot price set at add-to-cart time.
                $unitPrice = (float) $ci->price_snapshot;

                $components = [];
                foreach ($ci->children as $child) {
                    $cp = $child->product;
                    if (! $cp) {
                        continue;
                    }
                    $components[] = [
                        'product_id' => $cp->id,
                        'variant_id' => $child->variant_id,
                        // Already pre-multiplied at add time
                        // (bundle_qty * component_qty_in_bundle).
                        'quantity' => (int) $child->quantity,
                        'product_name' => $cp->name,
                    ];
                }

                $result[] = [
                    'is_bundle' => true,
                    'product_id' => $product->id,
                    'variant_id' => null,
                    'quantity' => $qty,
                    'price' => $unitPrice,
                    'line_total' => $unitPrice * $qty,
                    'product_name' => $product->name,
                    'components' => $components,
                ];

                continue;
            }

            // Simple product (existing behavior).
            $variant = $ci->variant;
            $price = $this->effectivePrice($product, $variant);
            $result[] = [
                'is_bundle' => false,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'quantity' => $qty,
                'price' => $price,
                'line_total' => $price * $qty,
                'product_name' => $product->name,
                'components' => [],
            ];
        }

        return $result;
    }

    /**
     * Return all active shipping zones this store exposes as selectable rates
     * on the storefront. Free-shipping threshold is applied per zone.
     *
     * @return array<int,array<string,mixed>>
     */
    protected function availableShippingRates(Store $store, ?string $district, float $subtotal): array
    {
        $zones = ShippingZone::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->orderBy('flat_rate')
            ->get();

        $rates = [];
        foreach ($zones as $zone) {
            // Expose every active zone so the customer can pick the one that
            // matches their location (e.g. "Dhaka City" vs "Outside Dhaka").
            // The zone's districts list is metadata shown on the admin side;
            // we don't hide zones that don't match the typed district because
            // customers often enter the wrong district name or leave it blank.
            $free = $zone->free_shipping_threshold !== null
                && $subtotal >= (float) $zone->free_shipping_threshold;

            $rates[] = [
                'id' => $zone->id,
                'name' => $zone->name,
                // Bilingual: storefront falls back to `name` when null/empty.
                'name_bn' => $zone->name_bn,
                'type' => 'flat',
                'amount' => (string) ($free ? '0.00' : number_format((float) $zone->flat_rate, 2, '.', '')),
                'delivery_estimate' => $zone->delivery_estimate,
                'delivery_estimate_bn' => $zone->delivery_estimate_bn,
                'free_shipping_threshold' => $zone->free_shipping_threshold !== null
                    ? (string) number_format((float) $zone->free_shipping_threshold, 2, '.', '')
                    : null,
            ];
        }

        // Fallback: if no zone is configured at all, expose a default COD-friendly option
        // so the storefront is usable out-of-the-box.
        if (empty($rates)) {
            $rates[] = [
                'id' => 0,
                'name' => 'Standard Shipping',
                'name_bn' => 'সাধারণ ডেলিভারি',
                'type' => 'flat',
                'amount' => '0.00',
                'delivery_estimate' => '3-5 business days',
                'delivery_estimate_bn' => '৩-৫ কার্যদিবস',
                'free_shipping_threshold' => null,
            ];
        }

        return $rates;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    protected function availablePaymentMethods(Store $store): array
    {
        $methods = PaymentMethod::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // When the vendor has enabled an advance-payment policy, hide pure
        // COD — letting the customer pick COD would let them sidestep the
        // advance entirely and defeat the purpose of the policy. The customer
        // still gets a COD remainder via the manual gateway in
        // delivery_charge / percentage modes.
        $advanceMode = (string) optional(
            \App\Models\StoreSetting::query()
                ->where('store_id', $store->id)
                ->where('key', 'payment.advance_mode')
                ->first()
        )->value ?: 'none';

        if ($advanceMode !== 'none') {
            $methods = $methods->reject(function (PaymentMethod $m) {
                $provider = $m->provider ?? $m->key ?? '';
                return in_array(strtolower((string) $provider), ['cod', 'cash'], true);
            })->values();
        }

        $out = $methods->map(function (PaymentMethod $m) {
            $provider = $m->provider ?? $m->key ?? 'other';
            $meta = is_array($m->metadata) ? $m->metadata : [];

            // Manual mobile-banking gateway. Two metadata shapes are supported:
            //   1. New: `channels` array with per-channel type/name/details.
            //   2. Legacy: flat `bkash_number / nagad_number / rocket_number`
            //      keys, auto-converted to MFS channels for backward compat.
            // The storefront only ever sees the new shape via `settings.channels`.
            $publicMeta = null;
            $name = $m->display_name ?? $m->name ?? ucfirst((string) $provider);
            if ($provider === 'manual') {
                $channels = $this->normaliseManualChannels($meta);
                $publicMeta = [
                    'channels' => $channels,
                    // Keep `wallets` in the response so any older storefront
                    // build that hasn't deployed yet still finds something.
                    // It mirrors the MFS subset of `channels`.
                    'wallets' => $this->channelsToLegacyWallets($channels),
                    'action_label' => trim((string) ($meta['action_label'] ?? '')) ?: null,
                    'instructions' => trim((string) ($meta['instructions'] ?? '')) ?: null,
                ];
                // Replace the stored display_name (often "bKash / Nagad / Rocket")
                // with one derived from the channel types the vendor *actually*
                // configured. Falls back to the stored name when there are zero
                // channels, so empty states still read sensibly.
                $derived = $this->deriveManualLabel($channels);
                if ($derived !== null) {
                    $name = $derived;
                }
            }

            return [
                'id' => $m->id,
                'store_id' => $m->store_id,
                'key' => $provider,
                'name' => $name,
                'description' => $m->description ?? null,
                'logo' => $m->logo ?? null,
                'is_active' => (bool) $m->is_active,
                'settings' => $publicMeta,
                'sort_order' => (int) ($m->sort_order ?? 0),
            ];
        })->values()->all();

        // Inline helpers below — keeping them as methods so the dashboard
        // could call `normaliseManualChannels` too if we ever expose a
        // GET /vendor/payment-methods/manual/preview endpoint.

        // Baseline: COD is always available even if nothing is configured yet,
        // so new stores can accept orders immediately. Skipped when the vendor
        // has enabled an advance policy — they explicitly don't want COD-only
        // orders, so the manual gateway is the required path.
        if (empty($out) && $advanceMode === 'none') {
            $out[] = [
                'id' => 0,
                'store_id' => $store->id,
                'key' => 'cod',
                'name' => 'Cash on Delivery',
                'description' => 'Pay with cash when your order arrives.',
                'logo' => null,
                'is_active' => true,
                'settings' => null,
                'sort_order' => 0,
            ];
        }

        return $out;
    }

    /**
     * Normalise `payment_methods.metadata` into a list of channels, accepting
     * both the new `channels` array and the legacy bkash/nagad/rocket fields.
     *
     * @param  array<string,mixed>  $meta
     * @return array<int,array<string,mixed>>
     */
    protected function normaliseManualChannels(array $meta): array
    {
        // Preferred: vendor saved a `channels` array.
        if (! empty($meta['channels']) && is_array($meta['channels'])) {
            $channels = [];
            foreach ($meta['channels'] as $idx => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $type = strtolower((string) ($row['type'] ?? 'mfs'));
                if (! in_array($type, ['mfs', 'bank', 'qr'], true)) {
                    $type = 'mfs';
                }
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    continue; // skip blank rows
                }

                $channel = [
                    'id'   => (string) ($row['id'] ?? 'ch'.($idx + 1)),
                    'type' => $type,
                    'name' => $name,
                ];

                if ($type === 'mfs') {
                    $num = trim((string) ($row['account_number'] ?? ''));
                    if ($num === '') {
                        continue;
                    }
                    $channel['account_number'] = $num;
                } elseif ($type === 'bank') {
                    $accountType = strtolower((string) ($row['account_type'] ?? ''));
                    if (! in_array($accountType, ['current', 'savings'], true)) {
                        $accountType = null;
                    }
                    $channel['account_name']   = trim((string) ($row['account_name'] ?? '')) ?: null;
                    $channel['account_number'] = trim((string) ($row['account_number'] ?? '')) ?: null;
                    $channel['bank_name']      = trim((string) ($row['bank_name'] ?? '')) ?: null;
                    $channel['branch_name']    = trim((string) ($row['branch_name'] ?? '')) ?: null;
                    $channel['account_type']   = $accountType;

                    // A bank channel is useful only with at least an account number.
                    if (! $channel['account_number']) {
                        continue;
                    }
                } elseif ($type === 'qr') {
                    $channel['qr_image_url'] = trim((string) ($row['qr_image_url'] ?? '')) ?: null;
                    if (! $channel['qr_image_url']) {
                        continue; // hide QR rows without an image
                    }
                }

                $channels[] = $channel;
            }
            return $channels;
        }

        // Fallback: legacy flat keys → 3 MFS channels.
        $legacy = [];
        foreach ([
            'bkash'  => 'bkash_number',
            'nagad'  => 'nagad_number',
            'rocket' => 'rocket_number',
        ] as $label => $metaKey) {
            $value = trim((string) ($meta[$metaKey] ?? ''));
            if ($value === '') {
                continue;
            }
            $legacy[] = [
                'id'   => $label,
                'type' => 'mfs',
                'name' => ucfirst($label),
                'account_number' => $value,
            ];
        }
        return $legacy;
    }

    /**
     * Builds the radio-button label for the manual gateway from the
     * channel types the vendor configured. Examples:
     *   - mfs only           → "MFS"
     *   - bank only          → "Bank"
     *   - mfs + bank         → "MFS / Bank"
     *   - mfs + bank + qr    → "MFS / Bank / QR"
     *
     * Returns null when there are zero channels so the caller can keep the
     * stored display_name as-is.
     *
     * @param  array<int,array<string,mixed>>  $channels
     */
    protected function deriveManualLabel(array $channels): ?string
    {
        if (empty($channels)) {
            return null;
        }

        $labels = [
            'mfs'  => 'MFS',
            'bank' => 'Bank',
            'qr'   => 'QR',
        ];

        // Canonical order regardless of how the vendor reordered channels in
        // the dashboard, so the label reads naturally (MFS / Bank / QR, not
        // QR / Bank / MFS).
        $present = [];
        foreach ($channels as $c) {
            $type = strtolower((string) ($c['type'] ?? ''));
            if (isset($labels[$type])) {
                $present[$type] = true;
            }
        }

        $parts = [];
        foreach (['mfs', 'bank', 'qr'] as $type) {
            if (isset($present[$type])) {
                $parts[] = $labels[$type];
            }
        }

        return $parts ? implode(' / ', $parts) : null;
    }

    /**
     * Project channels[] back into the legacy `wallets` map so older
     * storefront builds keep working until they redeploy.
     *
     * @param  array<int,array<string,mixed>>  $channels
     * @return array<string,string>
     */
    protected function channelsToLegacyWallets(array $channels): array
    {
        $wallets = [];
        foreach ($channels as $c) {
            if (($c['type'] ?? null) !== 'mfs') {
                continue;
            }
            $name = strtolower((string) ($c['name'] ?? ''));
            $num  = (string) ($c['account_number'] ?? '');
            if ($num === '') {
                continue;
            }
            // Map by name if it contains bkash/nagad/rocket, else by id.
            foreach (['bkash', 'nagad', 'rocket'] as $key) {
                if (str_contains($name, $key) && ! isset($wallets[$key])) {
                    $wallets[$key] = $num;
                    continue 2;
                }
            }
            $id = strtolower((string) ($c['id'] ?? ''));
            if (in_array($id, ['bkash', 'nagad', 'rocket'], true) && ! isset($wallets[$id])) {
                $wallets[$id] = $num;
            }
        }
        return $wallets;
    }

    /**
     * If the caller picked a specific rate_id, honour it (respecting the rate's
     * free-shipping threshold). Otherwise fall back to district-matching.
     */
    protected function resolveShippingFee(Store $store, ?int $rateId, ?string $district, float $subtotal): float
    {
        if ($rateId) {
            $zone = ShippingZone::query()
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->find($rateId);

            if ($zone) {
                if ($zone->free_shipping_threshold !== null && $subtotal >= (float) $zone->free_shipping_threshold) {
                    return 0.0;
                }
                return (float) $zone->flat_rate;
            }
        }

        return $this->calculateShipping($store, $district, $subtotal);
    }

    protected function calculateShipping(Store $store, ?string $district, float $subtotal): float
    {
        $zones = ShippingZone::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->get();

        if ($zones->isEmpty()) {
            return 0.0;
        }

        // Try to find a zone whose districts array contains the provided district.
        $match = null;
        if ($district) {
            foreach ($zones as $zone) {
                $districts = $zone->districts;
                if (is_array($districts) && in_array($district, $districts, true)) {
                    $match = $zone;
                    break;
                }
            }
        }

        // Fall back to first active zone.
        $match = $match ?? $zones->first();

        if ($match->free_shipping_threshold !== null && $subtotal >= (float) $match->free_shipping_threshold) {
            return 0.0;
        }

        return (float) $match->flat_rate;
    }

    protected function currentCouponCode(Request $request, Store $store): ?string
    {
        $customerId = auth('customer')->id();
        $cartToken = $request->header('X-Cart-Token')
            ?? $request->query('cart_token')
            ?? $request->input('cart_token');

        $coupon = CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->first();

        return $coupon?->code;
    }

    protected function resolveCouponDiscount(Store $store, ?string $code, float $subtotal): float
    {
        if (! $code) {
            return 0.0;
        }

        $discount = Discount::query()
            ->where('store_id', $store->id)
            ->where('code', $code)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->whereDate('end_date', '>=', today())
            ->first();

        if (! $discount) {
            return 0.0;
        }

        if ($discount->minimum_amount && $subtotal < (float) $discount->minimum_amount) {
            return 0.0;
        }

        $amount = match ($discount->type) {
            'percentage' => $subtotal * ((float) $discount->value / 100),
            'fixed' => (float) $discount->value,
            default => 0.0,
        };

        if ($discount->maximum_discount !== null) {
            $amount = min($amount, (float) $discount->maximum_discount);
        }

        return round(min($amount, $subtotal), 2);
    }

    protected function clearCartForRequest(Request $request, Store $store, ?int $customerId): void
    {
        $cartToken = $request->header('X-Cart-Token')
            ?? $request->query('cart_token')
            ?? $request->input('cart_token');

        CartItem::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();

        CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();
    }

    protected function generateOrderNumber(int $storeId): string
    {
        return \App\Helpers\OrderNumberGenerator::generate($storeId);
    }

    /**
     * Compute the effective unit price after applying any product- or
     * variant-level discount. Variant-specific discount fields take
     * precedence over the product's only when the variant has BOTH a
     * non-zero `discount` value and a `discount_type` set.
     *
     * Mirrors CartController::effectivePrice() and the storefront's
     * client-side `discountedPrice()` helper, so cart, checkout summary,
     * and the persisted order line items all agree on what the customer
     * actually pays.
     */
    protected function effectivePrice(Product $product, ?ProductVariant $variant): float
    {
        $base = (float) ($variant?->price ?? $product->price);

        if ($variant && (float) $variant->discount > 0 && $variant->discount_type) {
            $discount = (float) $variant->discount;
            $type = $variant->discount_type;
        } elseif ((float) ($product->discount ?? 0) > 0 && $product->discount_type) {
            $discount = (float) $product->discount;
            $type = $product->discount_type;
        } else {
            return $base;
        }

        $effective = match ($type) {
            'percent' => $base - ($base * $discount / 100),
            'flat' => $base - $discount,
            default => $base,
        };

        return max(0, $effective);
    }

    /**
     * Decrement product/variant stock + write inventory log + decrement
     * branch stock. Extracted from the order-creation loop so bundles
     * can reuse the exact same decrement path per component.
     *
     * Skips track_inventory=false products (e.g. bundle parent rows)
     * silently — the caller decides whether to invoke this.
     */
    protected function decrementStock(Store $store, Order $order, Product $product, ?ProductVariant $variant, int $quantity): void
    {
        if (! $product->track_inventory) {
            return;
        }

        // Re-fetch with a row lock inside the order's transaction so two
        // concurrent checkouts can't both pass a stale stock check and
        // oversell the same unit.
        if ($variant) {
            $locked = ProductVariant::where('id', $variant->id)->lockForUpdate()->first();
            $before = (int) $locked->stock;
            if ($before < $quantity) {
                $lbl = $locked->display_label ? " ({$locked->display_label})" : '';
                throw new \RuntimeException(
                    "Insufficient stock for {$product->name}{$lbl}. Available: {$before}.|{$product->name}{$lbl} পণ্যের স্টক নেই। পাওয়া যাচ্ছে: {$before}।"
                );
            }
            $locked->decrement('stock', $quantity);
            $after = $before - $quantity;
        } else {
            $locked = Product::where('id', $product->id)->lockForUpdate()->first();
            $before = (int) $locked->stock;
            if ($before < $quantity) {
                throw new \RuntimeException(
                    "Insufficient stock for {$product->name}. Available: {$before}.|{$product->name} পণ্যের স্টক নেই। পাওয়া যাচ্ছে: {$before}।"
                );
            }
            $locked->decrement('stock', $quantity);
            $after = $before - $quantity;
        }

        InventoryLog::create([
            'store_id' => $store->id,
            'branch_id' => null,
            'product_id' => $product->id,
            'variant_id' => $variant?->id,
            'type' => 'sale',
            'change_qty' => -1 * $quantity,
            'before_qty' => $before,
            'after_qty' => $after,
            'reference_type' => Order::class,
            'reference_id' => $order->id,
            'user_type' => 'system',
            'note' => 'Storefront order '.$order->order_number,
        ]);

        $branch = $store->branches()->where('is_main', true)->first()
            ?? $store->branches()->where('is_active', true)->first();

        if ($branch) {
            $branchStock = BranchStock::query()
                ->where('branch_id', $branch->id)
                ->where('product_id', $product->id)
                ->where('variant_id', $variant?->id)
                ->first();

            if ($branchStock) {
                $branchStock->decrement('stock', min($quantity, (int) $branchStock->stock));
            }
        }
    }
}
