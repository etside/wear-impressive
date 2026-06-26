<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class OrderController extends Controller
{
    /**
     * GET /api/customer/orders
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);
        $customer = auth('customer')->user();

        if (! $customer) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $query = Order::query()
            ->where('customer_id', $customer->id)
            ->with(['items']);

        if ($store) {
            $query->where('store_id', $store->id);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginator = $query->orderByDesc('created_at')->paginate($perPage);

        return ApiResponse::success($paginator, 'Orders loaded.');
    }

    /**
     * GET /api/customer/orders/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $customer = auth('customer')->user();

        if (! $customer) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $order = Order::query()
            ->where('customer_id', $customer->id)
            ->where('id', $id)
            ->with(['items', 'fulfillments', 'timeline'])
            ->first();

        if (! $order) {
            return ApiResponse::error('Order not found.', 404);
        }

        return ApiResponse::success($order, 'Order loaded.');
    }

    /**
     * GET /api/store/orders/track/{order_number}?email=...&phone=...
     */
    public function track(Request $request, string $order_number): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $email = (string) $request->query('email', '');
        $phone = (string) $request->query('phone', '');

        $customer = auth('customer')->user();

        if ($email === '' && $phone === '' && ! $customer) {
            return ApiResponse::error('Email or phone is required to track an order.', 422);
        }

        $order = Order::query()
            ->where('store_id', $store->id)
            ->where('order_number', $order_number)
            ->with(['items', 'fulfillments', 'timeline'])
            ->first();

        if (! $order) {
            return ApiResponse::error('Order not found.', 404);
        }

        // Verify identity. A logged-in customer who owns the order skips the
        // email/phone check entirely. Otherwise match either the guest
        // contact fields OR the linked customer's contact fields.
        $matches = false;

        if ($customer && $order->customer_id === $customer->id) {
            $matches = true;
        }

        if (! $matches && $email !== '') {
            if ($order->guest_email && strcasecmp($order->guest_email, $email) === 0) {
                $matches = true;
            } elseif ($order->customer && strcasecmp((string) $order->customer->email, $email) === 0) {
                $matches = true;
            }
        }

        if (! $matches && $phone !== '') {
            if ($order->guest_phone && $order->guest_phone === $phone) {
                $matches = true;
            } elseif ($order->customer && (string) $order->customer->phone === $phone) {
                $matches = true;
            }
        }

        if (! $matches) {
            return ApiResponse::error('Could not verify order.', 403);
        }

        return ApiResponse::success($order, 'Order loaded.');
    }
}
