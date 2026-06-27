<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Services\Payments\PaymentGatewayResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @group Storefront (Public)
 */
class PaymentController extends Controller
{
    /**
     * POST /api/store/payment/initiate/{order}
     *
     * Public endpoint (guest or auth'd customer). Looks up the order scoped to
     * the current store, resolves the configured gateway, and returns the
     * redirect URL the frontend should push the customer to.
     */
    public function initiate(Request $request, string $order, PaymentGatewayResolver $resolver): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $orderModel = Order::query()
            ->where('store_id', $store->id)
            ->where(function ($q) use ($order) {
                $q->where('id', $order)->orWhere('order_number', $order);
            })
            ->first();

        if (! $orderModel) {
            return ApiResponse::error('Order not found.', 404);
        }

        if ($orderModel->payment_status === 'paid') {
            return ApiResponse::error('Order is already paid.', 422);
        }

        $method = strtolower((string) $orderModel->payment_method);

        if (! in_array($method, ['sslcommerz', 'bkash', 'nagad'], true)) {
            return ApiResponse::error('This order does not use an online payment gateway.', 422);
        }

        try {
            $gateway = $resolver->resolve($method, $store);

            $result = $gateway->initiate($orderModel, [
                'ip' => $request->ip(),
            ]);

            $orderModel->payment_gateway_reference = $result['gateway_reference'] ?? null;
            $orderModel->payment_reference = $result['gateway_reference'] ?? $orderModel->payment_reference;
            $orderModel->payment_response = array_merge(
                (array) $orderModel->payment_response,
                ['initiate' => $result['raw'] ?? []],
            );
            $orderModel->save();

            return ApiResponse::success([
                'redirect_url'      => $result['redirect_url'] ?? null,
                'gateway_reference' => $result['gateway_reference'] ?? null,
                'payment_method'    => $method,
            ], 'Payment initiated.');
        } catch (PaymentGatewayException $e) {
            Log::channel('stack')->error('[payments] initiate.gateway_exception', [
                'gateway'      => $e->gateway(),
                'order_number' => $orderModel->order_number,
                'message'      => $e->getMessage(),
            ]);

            return ApiResponse::error('Payment gateway error. Please try again.', 502);
        } catch (Throwable $e) {
            Log::channel('stack')->error('[payments] initiate.unexpected', [
                'order_number' => $orderModel->order_number,
                'message'      => $e->getMessage(),
            ]);

            return ApiResponse::error('Unexpected payment error.', 500);
        }
    }
}
