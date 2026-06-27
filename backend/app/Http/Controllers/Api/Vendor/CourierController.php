<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Exceptions\CourierGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\DeliveryPartner;
use App\Models\Order;
use App\Models\OrderFulfillment;
use App\Models\OrderTimeline;
use App\Services\Couriers\CourierGatewayResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * @group Vendor Dashboard
 */
class CourierController extends Controller
{
    public function __construct(protected CourierGatewayResolver $resolver) {}

    /**
     * POST /api/vendor/orders/{order}/fulfillments/{fulfillment}/courier/book
     */
    public function book(Request $request, string $orderId, string $fulfillmentId): JsonResponse
    {
        $store = $request->store;

        $order = $store->orders()->findOrFail($orderId);
        $fulfillment = $order->fulfillments()->findOrFail($fulfillmentId);

        $data = $request->validate([
            'partner' => ['required', 'string', Rule::in(['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly'])],
            'context' => ['sometimes', 'array'],
        ]);

        $partnerSlug = $data['partner'];
        $context = $data['context'] ?? [];

        // Confirm the store has a DeliveryPartner row for this slug (for credential resolution).
        $partnerRow = DeliveryPartner::where('store_id', $store->id)
            ->where('provider', $partnerSlug)
            ->first();

        if ($partnerRow && ! $partnerRow->is_active) {
            return ApiResponse::error(ucfirst($partnerSlug).' is configured but not active for this store.', 422);
        }

        try {
            $gateway = $this->resolver->resolve($partnerSlug, $store);
            $result = $gateway->bookShipment($fulfillment, $context);
        } catch (CourierGatewayException $e) {
            Log::error('[couriers] book.failed', [
                'courier'        => $partnerSlug,
                'order_number'   => $order->order_number,
                'fulfillment_id' => $fulfillment->id,
                'message'        => $e->getMessage(),
            ]);

            return ApiResponse::error('Courier booking failed. Please try again.', 502);
        } catch (Throwable $e) {
            Log::error('[couriers] book.unexpected', [
                'courier'        => $partnerSlug,
                'order_number'   => $order->order_number,
                'fulfillment_id' => $fulfillment->id,
                'message'        => $e->getMessage(),
            ]);

            return ApiResponse::error('Unexpected courier error.', 500);
        }

        // Merge existing metadata with fresh courier info.
        $metadata = is_array($fulfillment->metadata) ? $fulfillment->metadata : [];
        $metadata['courier'] = $partnerSlug;
        $metadata['consignment_id'] = $result['consignment_id'] ?? null;
        $metadata['booked_at'] = now()->toIso8601String();
        $metadata['last_booking_response'] = $result['raw'] ?? [];

        $fulfillment->fill([
            'carrier'         => $partnerSlug,
            'tracking_number' => $result['tracking_number'] ?? $fulfillment->tracking_number,
            'tracking_url'    => $result['tracking_url'] ?? $fulfillment->tracking_url,
            'status'          => 'shipped',
            'shipped_at'      => $fulfillment->shipped_at ?? now(),
            'metadata'        => $metadata,
        ])->save();

        // Mirror to order when appropriate.
        if ($order->status === 'pending' || $order->status === 'confirmed' || $order->status === 'packed') {
            $order->status = 'shipped';
            $order->fulfillment_status = 'fulfilled';
            $order->save();
        }

        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : null);

        OrderTimeline::create([
            'order_id'    => $order->id,
            'event_type'  => 'fulfillment',
            'title'       => ucfirst($partnerSlug).' shipment booked',
            'description' => 'Tracking: '.(string) ($result['tracking_number'] ?? 'n/a'),
            'user_type'   => $userType,
            'user_id'     => $user?->id,
            'metadata'    => [
                'courier'         => $partnerSlug,
                'consignment_id'  => $result['consignment_id'] ?? null,
                'tracking_number' => $result['tracking_number'] ?? null,
                'tracking_url'    => $result['tracking_url'] ?? null,
            ],
        ]);

        Log::info('[couriers] book.success', [
            'courier'         => $partnerSlug,
            'order_number'    => $order->order_number,
            'tracking_number' => $result['tracking_number'] ?? null,
        ]);

        return ApiResponse::success([
            'fulfillment'     => $fulfillment->fresh(),
            'consignment_id'  => $result['consignment_id'] ?? null,
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url'    => $result['tracking_url'] ?? null,
        ], 'Shipment booked.');
    }

    /**
     * GET /api/vendor/fulfillments/{fulfillment}/courier/track
     */
    public function track(Request $request, string $fulfillmentId): JsonResponse
    {
        $store = $request->store;

        $fulfillment = OrderFulfillment::whereHas('order', fn ($q) => $q->where('store_id', $store->id))
            ->findOrFail($fulfillmentId);

        $partner = $this->partnerFromFulfillment($fulfillment);

        if (! $partner) {
            return ApiResponse::error('Fulfillment has no associated courier.', 422);
        }

        if (! $fulfillment->tracking_number) {
            return ApiResponse::error('Fulfillment has no tracking number.', 422);
        }

        try {
            $gateway = $this->resolver->resolve($partner, $store);
            $result = $gateway->track($fulfillment->tracking_number);
        } catch (CourierGatewayException $e) {
            Log::error('[couriers] track.failed', [
                'courier'         => $partner,
                'tracking_number' => $fulfillment->tracking_number,
                'message'         => $e->getMessage(),
            ]);

            return ApiResponse::error('Courier tracking failed. Please try again.', 502);
        } catch (Throwable $e) {
            return ApiResponse::error('Unexpected courier error.', 500);
        }

        Log::info('[couriers] track.success', [
            'courier'         => $partner,
            'tracking_number' => $fulfillment->tracking_number,
            'status'          => $result['status'] ?? 'unknown',
        ]);

        return ApiResponse::success([
            'tracking_number' => $fulfillment->tracking_number,
            'status'          => $result['status'] ?? 'unknown',
            'events'          => $result['events'] ?? [],
        ], 'Tracking fetched.');
    }

    /**
     * POST /api/vendor/fulfillments/{fulfillment}/courier/cancel
     */
    public function cancel(Request $request, string $fulfillmentId): JsonResponse
    {
        $store = $request->store;

        $fulfillment = OrderFulfillment::whereHas('order', fn ($q) => $q->where('store_id', $store->id))
            ->findOrFail($fulfillmentId);

        $partner = $this->partnerFromFulfillment($fulfillment);

        if (! $partner) {
            return ApiResponse::error('Fulfillment has no associated courier.', 422);
        }

        $consignmentId = (string) (($fulfillment->metadata['consignment_id'] ?? null) ?: $fulfillment->tracking_number);

        if ($consignmentId === '') {
            return ApiResponse::error('Fulfillment has no consignment reference.', 422);
        }

        try {
            $gateway = $this->resolver->resolve($partner, $store);
            $result = $gateway->cancel($consignmentId);
        } catch (CourierGatewayException $e) {
            Log::error('[couriers] cancel.failed', [
                'courier'         => $partner,
                'consignment_id'  => $consignmentId,
                'message'         => $e->getMessage(),
            ]);

            return ApiResponse::error('Courier cancel failed. Please try again.', 502);
        } catch (Throwable $e) {
            return ApiResponse::error('Unexpected courier error.', 500);
        }

        $fulfillment->fill(['status' => 'failed'])->save();

        $user = $request->user('vendor') ?? $request->user('staff');
        $userType = $request->user('vendor') ? 'vendor' : ($request->user('staff') ? 'staff' : null);

        OrderTimeline::create([
            'order_id'    => $fulfillment->order_id,
            'event_type'  => 'fulfillment',
            'title'       => ucfirst($partner).' shipment cancelled',
            'description' => 'Consignment: '.$consignmentId,
            'user_type'   => $userType,
            'user_id'     => $user?->id,
            'metadata'    => ['courier' => $partner, 'consignment_id' => $consignmentId],
        ]);

        return ApiResponse::success($result, 'Shipment cancelled.');
    }

    protected function partnerFromFulfillment(OrderFulfillment $fulfillment): ?string
    {
        $slug = (string) ($fulfillment->carrier ?? '');
        if ($slug && in_array($slug, ['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly'], true)) {
            return $slug;
        }

        $metaCourier = is_array($fulfillment->metadata)
            ? ($fulfillment->metadata['courier'] ?? null)
            : null;

        return $metaCourier ?: null;
    }
}
