<?php

namespace App\Services\Couriers\Gateways;

use App\Exceptions\CourierGatewayException;
use App\Models\OrderFulfillment;
use App\Services\Couriers\Contracts\CourierGateway;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class PathaoGateway implements CourierGateway
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function slug(): string
    {
        return 'pathao';
    }

    public function bookShipment(OrderFulfillment $fulfillment, array $context = []): array
    {
        $fulfillment->loadMissing('order');
        $order = $fulfillment->order;
        $shippingAddress = is_array($order->shipping_address) ? $order->shipping_address : [];

        $recipientName = $context['recipient_name']
            ?? Arr::get($shippingAddress, 'name')
            ?? $order->guest_name
            ?? 'Customer';

        $recipientPhone = $context['recipient_phone']
            ?? Arr::get($shippingAddress, 'phone')
            ?? $order->guest_phone
            ?? '';

        $recipientAddress = $context['recipient_address']
            ?? trim(collect([
                Arr::get($shippingAddress, 'address_line_1'),
                Arr::get($shippingAddress, 'address_line_2'),
                Arr::get($shippingAddress, 'city'),
                Arr::get($shippingAddress, 'postal_code'),
            ])->filter()->implode(', '));

        $payload = [
            'store_id'            => (int) ($context['store_id'] ?? $this->config['store_id'] ?? 0),
            'merchant_order_id'   => (string) ($context['merchant_order_id'] ?? $order->order_number ?? $order->id),
            'recipient_name'      => (string) $recipientName,
            'recipient_phone'     => (string) $recipientPhone,
            'recipient_address'   => (string) $recipientAddress,
            'recipient_city'      => (int) ($context['recipient_city'] ?? Arr::get($shippingAddress, 'city_id') ?? 1),
            'recipient_zone'      => (int) ($context['recipient_zone'] ?? Arr::get($shippingAddress, 'zone_id') ?? 1),
            'delivery_type'       => (int) ($context['delivery_type'] ?? 48),
            'item_type'           => (int) ($context['item_type'] ?? 2),
            'special_instruction' => (string) ($context['special_instruction'] ?? $fulfillment->notes ?? ''),
            'item_quantity'       => (int) ($context['item_quantity'] ?? max(1, (int) $order->items()->sum('quantity'))),
            'item_weight'         => (float) ($context['item_weight'] ?? $fulfillment->weight ?? 0.5),
            'amount_to_collect'   => (float) ($context['amount_to_collect'] ?? $fulfillment->cod_amount ?? 0),
            'item_description'    => (string) ($context['item_description'] ?? ('Order #'.$order->order_number)),
        ];

        $token = $this->getAccessToken();

        Log::info('courier.pathao.book.request', [
            'order_number'    => $order->order_number,
            'fulfillment_id'  => $fulfillment->id,
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ])
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/aladdin/api/v1/orders', $payload);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Pathao book request failed: '.$e->getMessage(),
                $this->slug(),
                ['order_number' => $order->order_number],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            Log::warning('courier.pathao.book.failed', [
                'order_number' => $order->order_number,
                'status'       => $response->status(),
                'body'         => $response->body(),
            ]);
            throw new CourierGatewayException(
                'Pathao book failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
                ['order_number' => $order->order_number],
            );
        }

        $raw = $response->json() ?? [];
        $data = Arr::get($raw, 'data', $raw);

        $consignmentId = Arr::get($data, 'consignment_id')
            ?? Arr::get($data, 'order_id')
            ?? Arr::get($data, 'id');

        $trackingNumber = (string) ($consignmentId ?? '');

        return [
            'consignment_id'  => $consignmentId,
            'tracking_number' => $trackingNumber ?: null,
            'tracking_url'    => $trackingNumber ? $this->buildTrackingUrl($trackingNumber) : null,
            'raw'             => $raw,
        ];
    }

    public function track(string $trackingNumber): array
    {
        $token = $this->getAccessToken();

        Log::info('courier.pathao.track.request', ['tracking_number' => $trackingNumber]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Accept'        => 'application/json',
            ])
                ->timeout($this->timeout())
                ->get($this->baseUrl().'/aladdin/api/v1/orders/'.$trackingNumber.'/info');
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Pathao track request failed: '.$e->getMessage(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'Pathao track failed: HTTP '.$response->status(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
            );
        }

        $raw = $response->json() ?? [];
        $data = Arr::get($raw, 'data', $raw);

        return [
            'status' => (string) (Arr::get($data, 'order_status') ?? Arr::get($data, 'status') ?? 'unknown'),
            'events' => (array) (Arr::get($data, 'events', [])),
            'raw'    => $raw,
        ];
    }

    public function cancel(string $consignmentId): array
    {
        $token = $this->getAccessToken();

        Log::info('courier.pathao.cancel.request', ['consignment_id' => $consignmentId]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Accept'        => 'application/json',
            ])
                ->timeout($this->timeout())
                ->put($this->baseUrl().'/aladdin/api/v1/orders/'.$consignmentId.'/cancel');
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Pathao cancel request failed: '.$e->getMessage(),
                $this->slug(),
                ['consignment_id' => $consignmentId],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'Pathao cancel failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
                ['consignment_id' => $consignmentId],
            );
        }

        return $response->json() ?? [];
    }

    public function priceQuote(array $payload): array
    {
        $token = $this->getAccessToken();

        $body = [
            'store_id'      => (int) ($payload['store_id'] ?? $this->config['store_id'] ?? 0),
            'item_type'     => (int) ($payload['item_type'] ?? 2),
            'delivery_type' => (int) ($payload['delivery_type'] ?? 48),
            'item_weight'   => (float) ($payload['item_weight'] ?? 0.5),
            'recipient_city' => (int) ($payload['recipient_city'] ?? 1),
            'recipient_zone' => (int) ($payload['recipient_zone'] ?? 1),
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ])
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/aladdin/api/v1/merchant/price-plan', $body);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Pathao price quote failed: '.$e->getMessage(),
                $this->slug(),
                [],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'Pathao price quote failed: HTTP '.$response->status(),
                $this->slug(),
            );
        }

        return $response->json() ?? [];
    }

    protected function getAccessToken(): string
    {
        $cacheKey = 'couriers.pathao.token.'.md5(($this->config['client_id'] ?? '').'|'.($this->config['username'] ?? ''));

        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $payload = [
            'client_id'     => $this->config['client_id'] ?? null,
            'client_secret' => $this->config['client_secret'] ?? null,
            'username'      => $this->config['username'] ?? null,
            'password'      => $this->config['password'] ?? null,
            'grant_type'    => 'password',
        ];

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept'       => 'application/json',
            ])
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/aladdin/api/v1/issue-token', $payload);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Pathao token request failed: '.$e->getMessage(),
                $this->slug(),
                [],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'Pathao token request failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
            );
        }

        $json = $response->json() ?? [];
        $token = Arr::get($json, 'access_token') ?? Arr::get($json, 'data.access_token');
        $expiresIn = (int) (Arr::get($json, 'expires_in') ?? Arr::get($json, 'data.expires_in') ?? 3600);

        if (! $token) {
            throw new CourierGatewayException('Pathao token response missing access_token.', $this->slug(), ['raw' => $json]);
        }

        $ttl = max(60, $expiresIn - 60);
        Cache::put($cacheKey, $token, $ttl);

        return $token;
    }

    protected function baseUrl(): string
    {
        $isTestMode = (bool) ($this->config['is_test_mode'] ?? true);

        return rtrim($isTestMode
            ? ($this->config['sandbox_base_url'] ?? 'https://courier-api-sandbox.pathao.com')
            : ($this->config['live_base_url'] ?? 'https://api-hermes.pathao.com'), '/');
    }

    protected function timeout(): int
    {
        return (int) ($this->config['timeout'] ?? config('couriers.default_timeout', 30));
    }

    protected function buildTrackingUrl(string $trackingNumber): string
    {
        return 'https://merchant.pathao.com/tracking?consignment_id='.rawurlencode($trackingNumber);
    }
}
