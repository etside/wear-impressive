<?php

namespace App\Services\Payments\Gateways;

use App\Exceptions\PaymentGatewayException;
use App\Models\Order;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class NagadGateway implements PaymentGateway
{
    /**
     * @param  array<string,mixed>  $config
     */
    public function __construct(protected array $config) {}

    public function name(): string
    {
        return 'nagad';
    }

    public function initiate(Order $order, array $context = []): array
    {
        $merchantId = (string) ($this->config['merchant_id'] ?? '');
        $orderId = $order->order_number;
        $datetime = now()->setTimezone('Asia/Dhaka')->format('YmdHis');
        $challenge = Str::random(20);

        $sensitive = json_encode([
            'merchantId' => $merchantId,
            'datetime'   => $datetime,
            'orderId'    => $orderId,
            'challenge'  => $challenge,
        ]);

        $payload = [
            'accountNumber' => $this->config['merchant_number'] ?? '',
            'dateTime'      => $datetime,
            'sensitiveData' => $this->encryptWithPublicKey($sensitive),
            'signature'     => $this->signWithPrivateKey($sensitive),
        ];

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $path = strtr(
            (string) ($this->config['endpoints']['initialize'] ?? ''),
            ['{merchantId}' => $merchantId, '{orderId}' => $orderId],
        );
        $endpoint = $base.$path;

        $this->log('info', 'nagad.initiate.request', $order, [
            'endpoint' => $endpoint,
            'datetime' => $datetime,
        ]);

        try {
            $response = Http::withHeaders($this->commonHeaders($context))
                ->timeout(30)
                ->post($endpoint, $payload);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'Nagad initialize HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['order' => $order->order_number],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'nagad.initiate.response', $order, [
            'status_code' => $response->status(),
            'status'      => $raw['status'] ?? null,
            'reason'      => $raw['reason'] ?? null,
        ]);

        if (! $response->ok() || empty($raw['sensitiveData']) || empty($raw['signature'])) {
            throw new PaymentGatewayException(
                'Nagad initialization failed: '.($raw['reason'] ?? 'unknown'),
                $this->name(),
                ['order' => $order->order_number, 'raw' => $raw],
            );
        }

        $decoded = $this->decryptWithPrivateKey((string) $raw['sensitiveData']);
        $decodedArr = json_decode($decoded, true) ?: [];

        $paymentRefId = (string) ($decodedArr['paymentReferenceId'] ?? '');
        $serverChallenge = (string) ($decodedArr['challenge'] ?? '');

        if ($paymentRefId === '') {
            throw new PaymentGatewayException(
                'Nagad response missing paymentReferenceId.',
                $this->name(),
                ['order' => $order->order_number, 'decoded' => $decodedArr],
            );
        }

        // Second leg: complete the checkout.
        $completePath = strtr(
            (string) ($this->config['endpoints']['complete'] ?? ''),
            ['{paymentRefId}' => $paymentRefId],
        );
        $completeEndpoint = $base.$completePath;

        $completeSensitive = json_encode([
            'merchantId'     => $merchantId,
            'orderId'        => $orderId,
            'amount'         => number_format((float) $order->total, 2, '.', ''),
            'currencyCode'   => '050',
            'challenge'      => $serverChallenge,
        ]);

        $completePayload = [
            'sensitiveData'  => $this->encryptWithPublicKey($completeSensitive),
            'signature'      => $this->signWithPrivateKey($completeSensitive),
            'merchantCallbackURL' => $context['callback_url'] ?? ($this->config['callback_url'] ?? ''),
        ];

        try {
            $completeResponse = Http::withHeaders($this->commonHeaders($context))
                ->timeout(30)
                ->post($completeEndpoint, $completePayload);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'Nagad complete HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['order' => $order->order_number],
                0,
                $e,
            );
        }

        $completeRaw = $completeResponse->json() ?: [];

        $this->log('info', 'nagad.complete.response', $order, [
            'status_code' => $completeResponse->status(),
            'status'      => $completeRaw['status'] ?? null,
            'reason'      => $completeRaw['reason'] ?? null,
            'paymentRefId' => $paymentRefId,
        ]);

        if (! $completeResponse->ok() || empty($completeRaw['callBackUrl'])) {
            throw new PaymentGatewayException(
                'Nagad checkout complete failed: '.($completeRaw['reason'] ?? 'unknown'),
                $this->name(),
                ['order' => $order->order_number, 'raw' => $completeRaw],
            );
        }

        return [
            'redirect_url'      => (string) $completeRaw['callBackUrl'],
            'gateway_reference' => $paymentRefId,
            'raw'               => [
                'initialize' => $raw,
                'complete'   => $completeRaw,
            ],
        ];
    }

    public function verify(string $reference, array $payload): array
    {
        $paymentRefId = $payload['payment_ref_id'] ?? $payload['paymentRefId'] ?? $reference;

        if (! $paymentRefId) {
            return ['status' => 'pending', 'raw' => $payload];
        }

        $base = rtrim((string) ($this->config['url_base'] ?? ''), '/');
        $path = strtr(
            (string) ($this->config['endpoints']['verify'] ?? ''),
            ['{paymentRefId}' => $paymentRefId],
        );
        $endpoint = $base.$path;

        try {
            $response = Http::withHeaders($this->commonHeaders([]))
                ->timeout(30)
                ->get($endpoint);
        } catch (Throwable $e) {
            throw new PaymentGatewayException(
                'Nagad verify HTTP failure: '.$e->getMessage(),
                $this->name(),
                ['reference' => $reference],
                0,
                $e,
            );
        }

        $raw = $response->json() ?: [];

        $this->log('info', 'nagad.verify.response', null, [
            'paymentRefId' => $paymentRefId,
            'status_code'  => $response->status(),
            'status'       => $raw['status'] ?? null,
        ]);

        $status = strtolower((string) ($raw['status'] ?? ''));

        return [
            'status' => match ($status) {
                'success', 'completed', 'paid' => 'paid',
                'failed', 'cancelled', 'canceled', 'aborted' => 'failed',
                default => 'pending',
            },
            'amount' => isset($raw['amount']) ? (float) $raw['amount'] : null,
            'raw'    => $raw,
        ];
    }

    public function refund(Order $order, float $amount): array
    {
        // Nagad does not expose a public refund REST endpoint. Merchants must
        // initiate refunds from the Nagad Merchant Portal and settle via their
        // daily reconciliation. We return a structured `manual_required` status
        // so the returns flow can record the intent and notify ops.
        $this->log('warning', 'nagad.refund.manual_required', $order, ['amount' => $amount]);

        return [
            'status' => 'manual_required',
            'amount' => $amount,
            'reference' => null,
            'raw' => [
                'message' => 'Nagad requires manual refund via merchant portal. No API is available for refunds at this time.',
                'merchant_portal' => 'https://porichoy.gov.bd/nagad-merchant',
            ],
        ];
    }

    /**
     * Headers Nagad requires on every merchant call.
     *
     * @return array<string,string>
     */
    protected function commonHeaders(array $context): array
    {
        return [
            'Accept'               => 'application/json',
            'Content-Type'         => 'application/json',
            'X-KM-Api-Version'     => 'v-0.2.0',
            'X-KM-IP-V4'           => (string) ($context['ip'] ?? request()->ip() ?? '127.0.0.1'),
            'X-KM-Client-Type'     => 'PC_WEB',
        ];
    }

    protected function encryptWithPublicKey(string $plain): string
    {
        $key = $this->normalizePublicKey((string) ($this->config['public_key'] ?? ''));
        $publicKey = openssl_pkey_get_public($key);

        if ($publicKey === false) {
            throw new PaymentGatewayException(
                'Nagad public key is missing or invalid.',
                $this->name(),
            );
        }

        if (! openssl_public_encrypt($plain, $encrypted, $publicKey, OPENSSL_PKCS1_PADDING)) {
            throw new PaymentGatewayException(
                'Nagad public_encrypt failed: '.openssl_error_string(),
                $this->name(),
            );
        }

        return base64_encode($encrypted);
    }

    protected function decryptWithPrivateKey(string $base64): string
    {
        $key = $this->normalizePrivateKey((string) ($this->config['private_key'] ?? ''));
        $privateKey = openssl_pkey_get_private($key);

        if ($privateKey === false) {
            throw new PaymentGatewayException(
                'Nagad private key is missing or invalid.',
                $this->name(),
            );
        }

        if (! openssl_private_decrypt(base64_decode($base64), $decrypted, $privateKey, OPENSSL_PKCS1_PADDING)) {
            throw new PaymentGatewayException(
                'Nagad private_decrypt failed: '.openssl_error_string(),
                $this->name(),
            );
        }

        return (string) $decrypted;
    }

    protected function signWithPrivateKey(string $plain): string
    {
        $key = $this->normalizePrivateKey((string) ($this->config['private_key'] ?? ''));
        $privateKey = openssl_pkey_get_private($key);

        if ($privateKey === false) {
            throw new PaymentGatewayException(
                'Nagad private key is missing or invalid.',
                $this->name(),
            );
        }

        if (! openssl_sign($plain, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new PaymentGatewayException(
                'Nagad sign failed: '.openssl_error_string(),
                $this->name(),
            );
        }

        return base64_encode($signature);
    }

    protected function normalizePublicKey(string $key): string
    {
        $key = trim($key);
        if ($key === '') {
            return '';
        }
        if (str_contains($key, 'BEGIN PUBLIC KEY')) {
            return $key;
        }

        return "-----BEGIN PUBLIC KEY-----\n".
            chunk_split($key, 64, "\n").
            "-----END PUBLIC KEY-----\n";
    }

    protected function normalizePrivateKey(string $key): string
    {
        $key = trim($key);
        if ($key === '') {
            return '';
        }
        if (str_contains($key, 'BEGIN') && str_contains($key, 'PRIVATE KEY')) {
            return $key;
        }

        return "-----BEGIN RSA PRIVATE KEY-----\n".
            chunk_split($key, 64, "\n").
            "-----END RSA PRIVATE KEY-----\n";
    }

    protected function log(string $level, string $event, ?Order $order, array $context = []): void
    {
        Log::channel('stack')->{$level}("[payments] {$event}", array_merge([
            'gateway'      => $this->name(),
            'order_number' => $order?->order_number,
        ], $context));
    }
}
