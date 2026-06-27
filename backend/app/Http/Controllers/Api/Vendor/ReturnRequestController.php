<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\RefundIssuedMail;
use App\Models\BranchStock;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderTimeline;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ReturnRequest;
use App\Services\Payments\PaymentGatewayResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * @group Vendor Dashboard
 */
class ReturnRequestController extends Controller
{
    /**
     * GET /api/vendor/returns
     */
    public function index(Request $request): JsonResponse
    {
        $query = ReturnRequest::where('store_id', $request->store->id)
            ->with(['order:id,order_number,total,customer_id', 'customer:id,name,phone,email', 'items']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($orderId = $request->input('order_id')) {
            $query->where('order_id', $orderId);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('requested_at', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('requested_at', '<=', $to);
        }

        $perPage = (int) $request->input('per_page', 20);
        $returns = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return ApiResponse::success($returns);
    }

    /**
     * GET /api/vendor/returns/{return}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $return = ReturnRequest::where('store_id', $request->store->id)
            ->with(['order', 'customer', 'items.orderItem.product:id,name,featured_image'])
            ->findOrFail($id);

        return ApiResponse::success($return);
    }

    /**
     * POST /api/vendor/returns/{return}/approve
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $return = ReturnRequest::where('store_id', $request->store->id)->findOrFail($id);

        if ($return->status !== 'pending') {
            return ApiResponse::error('Only pending returns can be approved.', 422);
        }

        $return->status = 'approved';
        $return->approved_at = now();
        $return->save();

        $this->logTimeline(
            $return->order_id,
            'status_change',
            'Return approved',
            'Return '.$return->return_number.' approved.',
            $request
        );

        return ApiResponse::success($return->fresh(), 'Return approved.');
    }

    /**
     * POST /api/vendor/returns/{return}/reject
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $return = ReturnRequest::where('store_id', $request->store->id)->findOrFail($id);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if (! in_array($return->status, ['pending', 'approved'], true)) {
            return ApiResponse::error('Cannot reject a return in status: '.$return->status, 422);
        }

        $return->status = 'rejected';
        $return->admin_notes = trim(($return->admin_notes ? $return->admin_notes."\n" : '').'Rejected: '.$data['reason']);
        $return->save();

        $this->logTimeline(
            $return->order_id,
            'status_change',
            'Return rejected',
            $data['reason'],
            $request
        );

        return ApiResponse::success($return->fresh(), 'Return rejected.');
    }

    /**
     * POST /api/vendor/returns/{return}/received
     */
    public function markReceived(Request $request, int $id): JsonResponse
    {
        $return = ReturnRequest::where('store_id', $request->store->id)
            ->with(['items.orderItem', 'order'])
            ->findOrFail($id);

        if ($return->status !== 'approved') {
            return ApiResponse::error('Only approved returns can be marked received.', 422);
        }

        DB::transaction(function () use ($return, $request) {
            $order = $return->order;

            foreach ($return->items as $returnItem) {
                $orderItem = $returnItem->orderItem;
                if (! $orderItem) {
                    continue;
                }

                $product = Product::find($orderItem->product_id);
                if (! $product || ! $product->track_inventory) {
                    continue;
                }
                $variant = $orderItem->variant_id ? ProductVariant::find($orderItem->variant_id) : null;

                $this->restoreStock(
                    store: $request->store,
                    product: $product,
                    variant: $variant,
                    qty: (int) $returnItem->quantity,
                    order: $order,
                    returnRequest: $return,
                    request: $request
                );

                // Update order item quantity_returned
                $orderItem->increment('quantity_returned', (int) $returnItem->quantity);
            }

            $return->status = 'received';
            $return->received_at = now();
            $return->save();

            $this->logTimeline(
                $return->order_id,
                'status_change',
                'Return received',
                'Return '.$return->return_number.' items received into stock.',
                $request
            );
        });

        return ApiResponse::success($return->fresh(), 'Return marked as received.');
    }

    /**
     * POST /api/vendor/returns/{return}/refund
     */
    public function processRefund(Request $request, int $id): JsonResponse
    {
        $return = ReturnRequest::where('store_id', $request->store->id)
            ->with('order')
            ->findOrFail($id);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'refund_method' => ['required', Rule::in(['original', 'store_credit', 'bank', 'manual'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if (! in_array($return->status, ['approved', 'received'], true)) {
            return ApiResponse::error('Cannot refund a return in status: '.$return->status, 422);
        }

        $order = $return->order;
        $refundAmount = (float) $data['amount'];
        $gatewayNote = null;

        // Attempt automatic gateway refund for original-payment-method refunds.
        if ($data['refund_method'] === 'original' && $order && in_array($order->payment_method, ['sslcommerz', 'bkash', 'nagad'], true)) {
            try {
                $gateway = app(PaymentGatewayResolver::class)->resolve($order->payment_method, $request->store);
                $result = $gateway->refund($order, $refundAmount);
                $gatewayStatus = $result['status'] ?? 'pending';

                if ($gatewayStatus === 'manual_required') {
                    $gatewayNote = '[Gateway] Manual refund required via merchant portal. Recorded intent; payout must be completed manually.';
                } elseif ($gatewayStatus === 'pending') {
                    $gatewayNote = '[Gateway] Refund initiated; awaiting confirmation. Reference: '.($result['reference'] ?? 'n/a');
                } else {
                    $gatewayNote = '[Gateway] Refund processed. Reference: '.($result['reference'] ?? 'n/a');
                }
            } catch (PaymentGatewayException $e) {
                Log::channel('stack')->error('[returns] gateway refund failed', [
                    'order_number' => $order->order_number,
                    'amount' => $refundAmount,
                    'error' => $e->getMessage(),
                ]);
                return ApiResponse::error('Gateway refund failed. Please try again.', 502);
            } catch (Throwable $e) {
                Log::channel('stack')->error('[returns] unexpected gateway error', ['error' => $e->getMessage()]);
                return ApiResponse::error('Unexpected gateway error. Refund not processed.', 502);
            }
        }

        DB::transaction(function () use ($return, $data, $request, $order, $refundAmount, $gatewayNote) {
            $return->status = 'refunded';
            $return->refund_amount = $refundAmount;
            $return->refund_method = $data['refund_method'];
            $return->refunded_at = now();
            $extraNote = trim((string) ($data['notes'] ?? '').($gatewayNote ? ' '.$gatewayNote : ''));
            if ($extraNote !== '') {
                $return->admin_notes = trim(($return->admin_notes ? $return->admin_notes."\n" : '').$extraNote);
            }
            $return->save();

            if ($order) {
                $orderTotal = (float) $order->total;
                $newAmountPaid = max(0, (float) ($order->amount_paid ?? 0) - $refundAmount);
                $order->amount_paid = $newAmountPaid;
                $order->payment_status = $refundAmount >= $orderTotal ? 'refunded' : ($newAmountPaid < $orderTotal ? 'partial' : 'paid');
                $order->save();

                $this->logTimeline(
                    $order->id,
                    'payment',
                    'Refund processed',
                    'Refunded '.number_format($refundAmount, 2).' via '.$data['refund_method'].' (return '.$return->return_number.').',
                    $request
                );
            }
        });

        // Email the customer outside the DB transaction.
        if ($order) {
            $to = $order->customer_email ?? $order->guest_email;
            if ($to) {
                try {
                    Mail::to($to)->queue(new RefundIssuedMail($order, $refundAmount, $request->store));
                } catch (Throwable $e) {
                    Log::channel('stack')->warning('[returns] refund email dispatch failed', [
                        'order_number' => $order->order_number,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return ApiResponse::success($return->fresh(), 'Refund processed.');
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    protected function restoreStock($store, Product $product, ?ProductVariant $variant, int $qty, ?Order $order, ReturnRequest $returnRequest, Request $request): void
    {
        $branchId = $order?->branch_id;

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
        } else {
            $before = (int) ($variant?->stock ?? $product->stock);
            $after = $before + $qty;
        }

        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : 'system');

        InventoryLog::create([
            'store_id' => $store->id,
            'branch_id' => $branchId,
            'product_id' => $product->id,
            'variant_id' => $variant?->id,
            'type' => 'return',
            'change_qty' => $qty,
            'before_qty' => $before,
            'after_qty' => $after,
            'reference_type' => ReturnRequest::class,
            'reference_id' => $returnRequest->id,
            'user_type' => $userType,
            'user_id' => $user?->id,
            'note' => 'Return '.$returnRequest->return_number.' received.',
        ]);

        if ($variant) {
            $variant->increment('stock', $qty);
        } else {
            $product->increment('stock', $qty);
        }
    }

    protected function logTimeline(int $orderId, string $eventType, string $title, ?string $description, Request $request): void
    {
        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : null);

        OrderTimeline::create([
            'order_id' => $orderId,
            'event_type' => $eventType,
            'title' => $title,
            'description' => $description,
            'user_type' => $userType,
            'user_id' => $user?->id,
        ]);
    }
}
