<?php

namespace App\Services\Payments\Gateways;

use App\Exceptions\PaymentGatewayException;
use App\Models\Order;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SslCommerzGateway implements PaymentGateway
{
    /**
     * @param  array<string,mixed>  $config
     */
    public function __construct(protected array $config) {}

    public function name(): string
    {
        return 'sslcommerz';
    }

    public function initiate(Order $order, array $context = []): array
    {
        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['session'] ?? '/gwprocess/v4/api.php');

        $payload = [
            'store_id'        => $this->config['store_id'] ?? null,
            'store_passwd'    => $this->config['store_password'] ?? null,
            'total_amount'    => number_format((float) $order->total, 2, '.', ''),
            'currency'        => 'BDT',
            'tran_id'         => $order->order_number,
            'success_url'     => $context['success_url'] ?? ($this->config['success_url'] ?? ''),
            'fail_url'        => $context['fail_url'] ?? ($this->config['fail_url'] ?? ''),
            'cancel_url'      => $context['cancel_url'] ?? ($this->config['cancel_url'] ?? ''),
            'ipn_url'         => $context['ipn_url'] ?? ($this->config['ipn_url'] ?? ''),
            'cus_name'        => $order->customer_name ?? $order->guest_name ?? 'Customer',
            'cus_email'       => $order->customer_email ?? $order->guest_email ?? 'noreply@example.com',
            'cus_phone'       => $order->customer_phone ?? $order->guest_phone ?? '01700000000',
            'cus_add1'        => data_get($order->shipping_address, 'address_line_1', 'N/A'),
            'cus_city'        => data_get($order->shipping_address, 'district', 'Dhaka'),
            'cus_country'     => 'Bangladesh',
            'shipping_method' => 'NO',
            'product_name'    => 'Order '.$order->order_number,
            'product_category' => 'general',
            'product_profile' => 'general',
        ];

        $this->log('info', 'sslcommerz.initiate.request', $order, [
            'endpoint' => $endpoint,
            // scrubbed
            'fields'   => array_diff_key($payload, ['store_passwd' => true]),
        ]);

        try {
            $response = Http::asForm()->timeout(30)->post($endpoint, $payload);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'SSLCommerz initiate HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['order' => $order->order_number],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'sslcommerz.initiate.response', $order, [
            'status_code' => $response->status(),
            'status'      => $raw['status'] ?? null,
            'failed_reason' => $raw['failedreason'] ?? null,
        ]);

        if (! $response->ok() || ($raw['status'] ?? null) !== 'SUCCESS' || empty($raw['GatewayPageURL'])) {
            throw new PaymentGatewayException(
                'SSLCommerz initiation failed: '.($raw['failedreason'] ?? 'unknown'),
                $this->name(),
                ['order' => $order->order_number, 'raw' => $raw],
            );
        }

        return [
            'redirect_url'      => (string) $raw['GatewayPageURL'],
            'gateway_reference' => (string) ($raw['sessionkey'] ?? $order->order_number),
            'raw'               => $raw,
        ];
    }

    public function verify(string $reference, array $payload): array
    {
        $valId = $payload['val_id'] ?? $payload['value_a'] ?? null;

        if (! $valId) {
            // With no val_id we can only rely on payload status.
            $status = strtolower((string) ($payload['status'] ?? ''));

            return [
                'status' => match ($status) {
                    'valid', 'validated' => 'paid',
                    'failed', 'canceled', 'cancelled' => 'failed',
                    default => 'pending',
                },
                'raw' => $payload,
            ];
        }

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['validate'] ?? '/validator/api/validationserverAPI.php');

        try {
            $response = Http::timeout(30)->get($endpoint, [
                'val_id'       => $valId,
                'store_id'     => $this->config['store_id'] ?? null,
                'store_passwd' => $this->config['store_password'] ?? null,
                'format'       => 'json',
            ]);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'SSLCommerz verify HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['reference' => $reference],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'sslcommerz.verify.response', null, [
            'val_id'      => $valId,
            'status_code' => $response->status(),
            'status'      => $raw['status'] ?? null,
            'tran_id'     => $raw['tran_id'] ?? null,
        ]);

        $status = strtoupper((string) ($raw['status'] ?? ''));

        return [
            'status' => match ($status) {
                'VALID', 'VALIDATED' => 'paid',
                'FAILED', 'CANCELLED', 'CANCELED' => 'failed',
                default => 'pending',
            },
            'amount' => isset($raw['amount']) ? (float) $raw['amount'] : null,
            'raw'    => $raw,
        ];
    }

    public function refund(Order $order, float $amount): array
    {
        $bankTranId = data_get($order->payment_response, 'bank_tran_id')
            ?? data_get($order->payment_response, 'val_id');

        if (! $bankTranId) {
            throw new PaymentGatewayException(
                'SSLCommerz refund requires bank_tran_id in payment_response. Original payment data missing.',
                $this->name(),
                ['order' => $order->order_number],
            );
        }

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.'/validator/api/merchantTransIDvalidationAPI.php';

        try {
            $response = Http::asForm()->timeout(30)->get($endpoint, [
                'bank_tran_id' => $bankTranId,
                'refund_amount' => number_format($amount, 2, '.', ''),
                'refund_remarks' => 'Refund for order '.$order->order_number,
                'refe_id' => $order->order_number,
                'store_id' => $this->config['store_id'] ?? null,
                'store_passwd' => $this->config['store_password'] ?? null,
                'format' => 'json',
                'v' => 1,
            ]);
        } catch (Throwable $e) {
            $this->log('error', 'sslcommerz.refund.http_error', $order, ['amount' => $amount, 'error' => $e->getMessage()]);
            throw new PaymentGatewayException('SSLCommerz refund HTTP error: '.$e->getMessage(), $this->name(), ['order' => $order->order_number]);
        }

        $raw = $response->json() ?: [];
        $apiStatus = strtoupper((string) ($raw['APIConnect'] ?? $raw['status'] ?? 'FAILED'));
        $refundRefId = $raw['refund_ref_id'] ?? null;

        $this->log('info', 'sslcommerz.refund.response', $order, [
            'amount' => $amount,
            'status' => $apiStatus,
            'refund_ref_id' => $refundRefId,
        ]);

        if ($apiStatus !== 'DONE' && $apiStatus !== 'SUCCESS' && $apiStatus !== 'INITIATED') {
            throw new PaymentGatewayException(
                'SSLCommerz refund failed: '.($raw['errorReason'] ?? $raw['failedreason'] ?? 'Unknown error'),
                $this->name(),
                ['order' => $order->order_number, 'response' => $raw],
            );
        }

        return [
            'status' => $apiStatus === 'INITIATED' ? 'pending' : 'refunded',
            'amount' => $amount,
            'reference' => $refundRefId,
            'raw' => $raw,
        ];
    }

    protected function log(string $level, string $event, ?Order $order, array $context = []): void
    {
        Log::channel('stack')->{$level}("[payments] {$event}", array_merge([
            'gateway'      => $this->name(),
            'order_number' => $order?->order_number,
        ], $context));
    }
}
