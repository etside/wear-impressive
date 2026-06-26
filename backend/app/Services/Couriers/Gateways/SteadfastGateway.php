<?php

namespace App\Services\Couriers\Gateways;

use App\Exceptions\CourierGatewayException;
use App\Models\OrderFulfillment;
use App\Services\Couriers\Contracts\CourierGateway;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SteadfastGateway implements CourierGateway
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function slug(): string
    {
        return 'steadfast';
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
            'invoice'           => (string) ($context['invoice'] ?? $order->order_number ?? $order->id),
            'recipient_name'    => (string) $recipientName,
            'recipient_phone'   => (string) $recipientPhone,
            'recipient_address' => (string) $recipientAddress,
            'cod_amount'        => (float) ($context['cod_amount'] ?? $fulfillment->cod_amount ?? 0),
            'note'              => (string) ($context['note'] ?? $fulfillment->notes ?? ''),
        ];

        Log::info('courier.steadfast.book.request', [
            'order_number'   => $order->order_number,
            'fulfillment_id' => $fulfillment->id,
        ]);

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/create_order', $payload);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Steadfast book request failed: '.$e->getMessage(),
                $this->slug(),
                ['order_number' => $order->order_number],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            Log::warning('courier.steadfast.book.failed', [
                'order_number' => $order->order_number,
                'status'       => $response->status(),
                'body'         => $response->body(),
            ]);
            throw new CourierGatewayException(
                'Steadfast book failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
                ['order_number' => $order->order_number],
            );
        }

        $raw = $response->json() ?? [];
        $consignment = Arr::get($raw, 'consignment', []);

        $consignmentId = Arr::get($consignment, 'consignment_id') ?? Arr::get($raw, 'consignment_id');
        $trackingCode = Arr::get($consignment, 'tracking_code') ?? Arr::get($raw, 'tracking_code');
        $trackingLink = Arr::get($consignment, 'tracking_link') ?? null;

        return [
            'consignment_id'  => $consignmentId,
            'tracking_number' => $trackingCode ?: ($consignmentId ? (string) $consignmentId : null),
            'tracking_url'    => $trackingLink ?: ($trackingCode
                ? 'https://steadfast.com.bd/track/consignment/'.rawurlencode((string) $trackingCode)
                : null),
            'raw' => $raw,
        ];
    }

    public function track(string $trackingNumber): array
    {
        Log::info('courier.steadfast.track.request', ['tracking_number' => $trackingNumber]);

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->get($this->baseUrl().'/status_by_cid/'.$trackingNumber);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'Steadfast track request failed: '.$e->getMessage(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            // Try by invoice as fallback
            try {
                $response = Http::withHeaders($this->authHeaders())
                    ->timeout($this->timeout())
                    ->get($this->baseUrl().'/status_by_invoice/'.$trackingNumber);
            } catch (Throwable $e) {
                throw new CourierGatewayException(
                    'Steadfast track failed: '.$e->getMessage(),
                    $this->slug(),
                    ['tracking_number' => $trackingNumber],
                    0,
                    $e,
                );
            }
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'Steadfast track failed: HTTP '.$response->status(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
            );
        }

        $raw = $response->json() ?? [];

        return [
            'status' => (string) (Arr::get($raw, 'delivery_status') ?? Arr::get($raw, 'status') ?? 'unknown'),
            'events' => (array) (Arr::get($raw, 'events', [])),
            'raw'    => $raw,
        ];
    }

    public function cancel(string $consignmentId): array
    {
        // Steadfast does not expose a public cancel endpoint.
        throw new CourierGatewayException(
            'Steadfast does not support programmatic cancellation; contact Steadfast support.',
            $this->slug(),
            ['consignment_id' => $consignmentId],
        );
    }

    public function priceQuote(array $payload): array
    {
        // Steadfast pricing is configured per merchant contract and not exposed via API.
        return [
            'currency' => 'BDT',
            'amount'   => null,
            'note'     => 'Steadfast pricing is configured per merchant contract and not exposed via API.',
        ];
    }

    protected function authHeaders(): array
    {
        return [
            'Api-Key'    => $this->config['api_key'] ?? '',
            'Secret-Key' => $this->config['secret_key'] ?? '',
            'Content-Type' => 'application/json',
            'Accept'     => 'application/json',
        ];
    }

    protected function baseUrl(): string
    {
        $isTestMode = (bool) ($this->config['is_test_mode'] ?? false);

        return rtrim($isTestMode
            ? ($this->config['sandbox_base_url'] ?? 'https://portal.packzy.com/api/v1')
            : ($this->config['live_base_url'] ?? 'https://portal.steadfast.com.bd/api/v1'), '/');
    }

    protected function timeout(): int
    {
        return (int) ($this->config['timeout'] ?? config('couriers.default_timeout', 30));
    }
}
