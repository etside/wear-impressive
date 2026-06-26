<?php

namespace App\Http\Controllers\Api\Webhook;

use App\Events\OrderConfirmed;
use App\Events\PaymentReceived;
use App\Events\UpdatedPaymentStatus;
use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Models\OrderTimeline;
use App\Services\Payments\PaymentGatewayResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentWebhookController extends Controller
{
    public function __construct(protected PaymentGatewayResolver $resolver) {}

    public function sslcommerz(Request $request): JsonResponse
    {
        $payload = $this->payload($request);
        $tranId = (string) ($payload['tran_id'] ?? '');

        if ($tranId === '') {
            return ApiResponse::error('Missing tran_id.', 422);
        }

        $order = Order::query()->where('order_number', $tranId)->first();

        return $this->handleWebhook('sslcommerz', $order, $tranId, $payload);
    }

    public function bkash(Request $request): JsonResponse
    {
        $payload = $this->payload($request);
        $paymentId = (string) ($payload['paymentID'] ?? '');
        $invoice = (string) ($payload['merchantInvoiceNumber'] ?? '');

        $order = null;
        if ($paymentId !== '') {
            $order = Order::query()
                ->where(function ($q) use ($paymentId) {
                    $q->where('payment_gateway_reference', $paymentId)
                        ->orWhere('payment_reference', $paymentId);
                })
                ->first();
        }
        if (! $order && $invoice !== '') {
            $order = Order::query()->where('order_number', $invoice)->first();
        }

        return $this->handleWebhook('bkash', $order, $paymentId ?: $invoice, $payload);
    }

    public function nagad(Request $request): JsonResponse
    {
        $payload = $this->payload($request);
        $paymentRefId = (string) ($payload['payment_ref_id'] ?? $payload['paymentRefId'] ?? '');
        $orderId = (string) ($payload['order_id'] ?? $payload['orderId'] ?? '');

        $order = null;
        if ($paymentRefId !== '') {
            $order = Order::query()
                ->where(function ($q) use ($paymentRefId) {
                    $q->where('payment_gateway_reference', $paymentRefId)
                        ->orWhere('payment_reference', $paymentRefId);
                })
                ->first();
        }
        if (! $order && $orderId !== '') {
            $order = Order::query()->where('order_number', $orderId)->first();
        }

        return $this->handleWebhook('nagad', $order, $paymentRefId ?: $orderId, $payload);
    }

    /**
     * Shared pipeline: resolve gateway, call verify(), persist status, fire event.
     */
    protected function handleWebhook(string $gateway, ?Order $order, string $reference, array $payload): JsonResponse
    {
        if (! $order) {
            Log::channel('stack')->warning('[payments] webhook.order_not_found', [
                'gateway'   => $gateway,
                'reference' => $reference,
            ]);

            return ApiResponse::error('Order not found.', 404);
        }

        try {
            $gwInstance = $this->resolver->resolve($gateway, $order->store);
            $verified = $gwInstance->verify($reference, $payload);
        } catch (PaymentGatewayException $e) {
            Log::channel('stack')->error('[payments] webhook.gateway_exception', [
                'gateway'      => $gateway,
                'order_number' => $order->order_number,
                'message'      => $e->getMessage(),
            ]);

            return ApiResponse::error('Gateway verify failed: '.$e->getMessage(), 502);
        } catch (Throwable $e) {
            Log::channel('stack')->error('[payments] webhook.unexpected', [
                'gateway'      => $gateway,
                'order_number' => $order->order_number,
                'message'      => $e->getMessage(),
            ]);

            return ApiResponse::error('Unexpected webhook error.', 500);
        }

        $newStatus = (string) ($verified['status'] ?? 'pending');
        $previousStatus = (string) $order->payment_status;

        $orderPaymentStatus = match ($newStatus) {
            'paid'   => 'paid',
            'failed' => 'failed',
            default  => $previousStatus,
        };

        $order->payment_status = $orderPaymentStatus;
        $order->payment_gateway_reference = $order->payment_gateway_reference ?: $reference;
        $order->payment_reference = $order->payment_reference ?: $reference;
        $order->payment_response = array_merge(
            (array) $order->payment_response,
            ['verify' => $verified['raw'] ?? [], 'webhook' => $payload],
        );

        $justConfirmed = false;
        if ($newStatus === 'paid' && $order->status === 'pending') {
            $order->status = 'confirmed';
            $justConfirmed = true;
        }

        $order->save();

        OrderTimeline::create([
            'order_id'     => $order->id,
            'event_type'   => 'payment',
            'title'        => ucfirst($gateway).' payment '.$newStatus,
            'description'  => 'Reference: '.$reference,
            'user_type'    => 'system',
            'user_id'      => null,
            'metadata'     => [
                'gateway'   => $gateway,
                'reference' => $reference,
                'status'    => $newStatus,
            ],
        ]);

        event(new UpdatedPaymentStatus(
            order: $order,
            previousStatus: $previousStatus,
            newStatus: $orderPaymentStatus,
            gateway: $gateway,
            payload: $payload,
        ));

        if ($orderPaymentStatus === 'paid' && $previousStatus !== 'paid') {
            event(new PaymentReceived($order));
        }

        if ($justConfirmed) {
            event(new OrderConfirmed($order));
        }

        return ApiResponse::success([
            'order_number'   => $order->order_number,
            'payment_status' => $order->payment_status,
            'verify_status'  => $newStatus,
        ], 'Webhook processed.');
    }

    /**
     * Merge JSON + form body + query string so gateways using any of those work.
     */
    protected function payload(Request $request): array
    {
        return array_merge(
            (array) $request->query(),
            (array) $request->post(),
            (array) $request->json()->all(),
        );
    }
}
