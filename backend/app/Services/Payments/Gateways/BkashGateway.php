<?php

namespace App\Services\Payments\Gateways;

use App\Exceptions\PaymentGatewayException;
use App\Models\Order;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class BkashGateway implements PaymentGateway
{
    /**
     * @param  array<string,mixed>  $config
     */
    public function __construct(protected array $config) {}

    public function name(): string
    {
        return 'bkash';
    }

    public function initiate(Order $order, array $context = []): array
    {
        $token = $this->grantToken();

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['create'] ?? '/tokenized/checkout/create');

        $payload = [
            'mode'                    => '0011',
            'payerReference'          => $order->customer_phone ?? $order->guest_phone ?? $order->order_number,
            'callbackURL'             => $context['callback_url'] ?? ($this->config['callback_url'] ?? ''),
            'amount'                  => number_format((float) $order->total, 2, '.', ''),
            'currency'                => 'BDT',
            'intent'                  => 'sale',
            'merchantInvoiceNumber'   => $order->order_number,
        ];

        $this->log('info', 'bkash.initiate.request', $order, [
            'endpoint' => $endpoint,
            'amount'   => $payload['amount'],
        ]);

        try {
            $response = Http::withHeaders([
                'Accept'        => 'application/json',
                'Authorization' => $token,
                'X-APP-Key'     => $this->config['app_key'] ?? '',
            ])->timeout(30)->post($endpoint, $payload);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'bKash create HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['order' => $order->order_number],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'bkash.initiate.response', $order, [
            'status_code'  => $response->status(),
            'statusCode'   => $raw['statusCode'] ?? null,
            'statusMessage' => $raw['statusMessage'] ?? null,
            'paymentID'    => $raw['paymentID'] ?? null,
        ]);

        if (! $response->ok() || empty($raw['bkashURL']) || empty($raw['paymentID'])) {
            throw new PaymentGatewayException(
                'bKash payment creation failed: '.($raw['statusMessage'] ?? 'unknown'),
                $this->name(),
                ['order' => $order->order_number, 'raw' => $raw],
            );
        }

        return [
            'redirect_url'      => (string) $raw['bkashURL'],
            'gateway_reference' => (string) $raw['paymentID'],
            'raw'               => $raw,
        ];
    }

    public function verify(string $reference, array $payload): array
    {
        $paymentId = $payload['paymentID'] ?? $reference;

        if (! $paymentId) {
            return ['status' => 'pending', 'raw' => $payload];
        }

        $token = $this->grantToken();
        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['execute'] ?? '/tokenized/checkout/execute');

        try {
            $response = Http::withHeaders([
                'Accept'        => 'application/json',
                'Authorization' => $token,
                'X-APP-Key'     => $this->config['app_key'] ?? '',
            ])->timeout(30)->post($endpoint, ['paymentID' => $paymentId]);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'bKash execute HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['reference' => $reference],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'bkash.verify.response', null, [
            'paymentID'     => $paymentId,
            'status_code'   => $response->status(),
            'transactionStatus' => $raw['transactionStatus'] ?? null,
            'statusCode'    => $raw['statusCode'] ?? null,
        ]);

        $txStatus = strtolower((string) ($raw['transactionStatus'] ?? ''));

        $status = match ($txStatus) {
            'completed' => 'paid',
            'initiated', '' => 'pending',
            default => 'failed',
        };

        // Treat non-zero statusCode as failure if transactionStatus missing.
        if ($status === 'pending' && ! empty($raw['statusCode']) && $raw['statusCode'] !== '0000') {
            $status = 'failed';
        }

        return [
            'status' => $status,
            'amount' => isset($raw['amount']) ? (float) $raw['amount'] : null,
            'raw'    => $raw,
        ];
    }

    public function refund(Order $order, float $amount): array
    {
        $paymentId = $order->payment_gateway_reference
            ?? data_get($order->payment_response, 'paymentID');
        $trxId = data_get($order->payment_response, 'trxID')
            ?? data_get($order->payment_response, 'trx_id');

        if (! $paymentId || ! $trxId) {
            throw new PaymentGatewayException(
                'bKash refund requires paymentID + trxID from the original payment response.',
                $this->name(),
                ['order' => $order->order_number],
            );
        }

        $token = $this->grantToken();
        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['refund'] ?? '/tokenized/checkout/payment/refund');

        $payload = [
            'paymentID' => $paymentId,
            'amount'    => number_format($amount, 2, '.', ''),
            'trxID'     => $trxId,
            'sku'       => 'order-'.$order->order_number,
            'reason'    => 'Refund for order '.$order->order_number,
        ];

        $this->log('info', 'bkash.refund.request', $order, ['paymentID' => $paymentId, 'amount' => $amount]);

        try {
            $response = Http::withHeaders([
                'Accept'        => 'application/json',
                'Authorization' => $token,
                'X-APP-Key'     => $this->config['app_key'] ?? '',
            ])->timeout(30)->post($endpoint, $payload);
        } catch (Throwable $e) {
            $this->log('error', 'bkash.refund.http_error', $order, ['error' => $e->getMessage()]);
            throw new PaymentGatewayException('bKash refund HTTP error: '.$e->getMessage(), $this->name(), ['order' => $order->order_number]);
        }

        $raw = $response->json() ?: [];
        $statusCode = (string) ($raw['statusCode'] ?? '');
        $transactionStatus = (string) ($raw['transactionStatus'] ?? '');

        $this->log('info', 'bkash.refund.response', $order, [
            'statusCode' => $statusCode,
            'transactionStatus' => $transactionStatus,
            'refundTrxID' => $raw['refundTrxID'] ?? null,
        ]);

        if (! $response->ok() || ($statusCode !== '0000' && $transactionStatus !== 'Completed')) {
            throw new PaymentGatewayException(
                'bKash refund failed: '.($raw['statusMessage'] ?? $raw['errorMessage'] ?? 'Unknown'),
                $this->name(),
                ['order' => $order->order_number, 'response' => $raw],
            );
        }

        return [
            'status' => 'refunded',
            'amount' => isset($raw['amount']) ? (float) $raw['amount'] : $amount,
            'reference' => $raw['refundTrxID'] ?? null,
            'raw' => $raw,
        ];
    }

    /**
     * Grant (and cache) a tokenized checkout id_token.
     */
    protected function grantToken(): string
    {
        $cacheKey = 'bkash.id_token.'.($this->config['is_sandbox'] ? 'sandbox' : 'live');

        $cached = Cache::get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $endpoint = $base.($this->config['endpoints']['grant_token'] ?? '/tokenized/checkout/token/grant');

        try {
            $response = Http::withHeaders([
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
                'username'     => (string) ($this->config['username'] ?? ''),
                'password'     => (string) ($this->config['password'] ?? ''),
            ])->timeout(30)->post($endpoint, [
                'app_key'    => $this->config['app_key'] ?? '',
                'app_secret' => $this->config['app_secret'] ?? '',
            ]);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'bKash grant_token HTTP failure: '.$e->getMessage(),
                $this->name(),
                [],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        if (! $response->ok() || empty($raw['id_token'])) {
            Log::channel('stack')->error('[payments] bkash.grant_token.failed', [
                'gateway'     => $this->name(),
                'status_code' => $response->status(),
                'statusCode'  => $raw['statusCode'] ?? null,
                'statusMessage' => $raw['statusMessage'] ?? null,
            ]);
            throw new PaymentGatewayException(
                'bKash token grant failed: '.($raw['statusMessage'] ?? 'unknown'),
                $this->name(),
                ['raw' => $raw],
            );
        }

        $token = (string) $raw['id_token'];
        $ttl = (int) ($raw['expires_in'] ?? 3600) - 60; // minus safety
        Cache::put($cacheKey, $token, max(60, $ttl));

        return $token;
    }

    protected function log(string $level, string $event, ?Order $order, array $context = []): void
    {
        Log::channel('stack')->{$level}("[payments] {$event}", array_merge([
            'gateway'      => $this->name(),
            'order_number' => $order?->order_number,
        ], $context));
    }
}
