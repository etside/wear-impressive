<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\OrderFulfillment;
use App\Models\OrderTimeline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class OrderFulfillmentController extends Controller
{
    /**
     * GET /api/vendor/orders/{order}/fulfillments/{fulfillment}
     */
    public function show(Request $request, string $orderId, string $fulfillmentId): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($orderId);

        $fulfillment = $order->fulfillments()->findOrFail($fulfillmentId);

        return ApiResponse::success($fulfillment);
    }

    /**
     * POST /api/vendor/orders/{order}/fulfillments
     */
    public function store(Request $request, string $orderId): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($orderId);

        $data = $request->validate([
            'carrier' => ['nullable', Rule::in(['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly', 'self', 'other'])],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', Rule::in(['pending', 'packed', 'shipped', 'in_transit', 'delivered', 'failed'])],
            'estimated_delivery' => ['nullable', 'date'],
            'shipped_at' => ['nullable', 'date'],
            'delivered_at' => ['nullable', 'date'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'cod_amount' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        // Default cod_amount to the order's frozen cod_amount (computed from
        // the vendor's advance-payment policy at checkout). Falls back to the
        // full order total for legacy orders that pre-date the advance split.
        $defaultCod = $order->cod_amount ?? $order->total;

        $fulfillment = OrderFulfillment::create(array_merge(
            [
                'order_id' => $order->id,
                'status' => $data['status'] ?? 'pending',
                'cod_amount' => $defaultCod,
            ],
            $data
        ));

        $this->logTimeline(
            $order->id,
            'fulfillment',
            'Fulfillment created',
            'Via '.($data['carrier'] ?? 'pending').(isset($data['tracking_number']) ? ' (tracking: '.$data['tracking_number'].')' : ''),
            $request
        );

        return ApiResponse::success($fulfillment, 'Fulfillment created.', 201);
    }

    /**
     * PATCH /api/vendor/orders/{order}/fulfillments/{fulfillment}
     */
    public function update(Request $request, string $orderId, string $fulfillmentId): JsonResponse
    {
        $order = $request->store->orders()->findOrFail($orderId);
        $fulfillment = $order->fulfillments()->findOrFail($fulfillmentId);

        $data = $request->validate([
            'carrier' => ['sometimes', Rule::in(['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly', 'self', 'other'])],
            'tracking_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tracking_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'status' => ['sometimes', Rule::in(['pending', 'packed', 'shipped', 'in_transit', 'delivered', 'failed'])],
            'estimated_delivery' => ['sometimes', 'nullable', 'date'],
            'shipped_at' => ['sometimes', 'nullable', 'date'],
            'delivered_at' => ['sometimes', 'nullable', 'date'],
            'shipping_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'cod_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'weight' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $fulfillment->fill($data)->save();

        // If status changed to shipped/delivered, mirror to order + timeline
        if (isset($data['status'])) {
            if ($data['status'] === 'shipped' && $order->status !== 'shipped') {
                $order->status = 'shipped';
                $order->fulfillment_status = 'fulfilled';
                $order->save();
                $this->logTimeline($order->id, 'fulfillment', 'Fulfillment shipped', null, $request);
            } elseif ($data['status'] === 'delivered' && $order->status !== 'delivered') {
                $order->status = 'delivered';
                $order->fulfillment_status = 'fulfilled';
                $order->save();
                $this->logTimeline($order->id, 'status_change', 'Order delivered', null, $request);
            }
        }

        return ApiResponse::success($fulfillment->fresh(), 'Fulfillment updated.');
    }

    protected function logTimeline(string $orderId, string $eventType, string $title, ?string $description, Request $request): void
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
