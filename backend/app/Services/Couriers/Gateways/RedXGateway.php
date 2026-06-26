<?php

namespace App\Services\Couriers\Gateways;

use App\Exceptions\CourierGatewayException;
use App\Models\OrderFulfillment;
use App\Services\Couriers\Contracts\CourierGateway;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class RedXGateway implements CourierGateway
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function slug(): string
    {
        return 'redx';
    }

    public function bookShipment(OrderFulfillment $fulfillment, array $context = []): array
    {
        $fulfillment->loadMissing('order');
        $order = $fulfillment->order;
        $shippingAddress = is_array($order->shipping_address) ? $order->shipping_address : [];

        $customerName = $context['customer_name']
            ?? Arr::get($shippingAddress, 'name')
            ?? $order->guest_name
            ?? 'Customer';

        $customerPhone = $context['customer_phone']
            ?? Arr::get($shippingAddress, 'phone')
            ?? $order->guest_phone
            ?? '';

        $customerAddress = $context['customer_address']
            ?? trim(collect([
                Arr::get($shippingAddress, 'address_line_1'),
                Arr::get($shippingAddress, 'address_line_2'),
                Arr::get($shippingAddress, 'city'),
                Arr::get($shippingAddress, 'postal_code'),
            ])->filter()->implode(', '));

        $payload = [
            'customer_name'          => (string) $customerName,
            'customer_phone'         => (string) $customerPhone,
            'delivery_area'          => (string) ($context['delivery_area'] ?? Arr::get($shippingAddress, 'city') ?? ''),
            'delivery_area_id'       => (int) ($context['delivery_area_id'] ?? Arr::get($shippingAddress, 'area_id') ?? 0),
            'customer_address'       => (string) $customerAddress,
            'merchant_invoice_id'    => (string) ($context['merchant_invoice_id'] ?? $order->order_number ?? $order->id),
            'cash_collection_amount' => (float) ($context['cash_collection_amount'] ?? $fulfillment->cod_amount ?? 0),
            'parcel_weight'          => (float) ($context['parcel_weight'] ?? $fulfillment->weight ?? 0.5),
            'value'                  => (float) ($context['value'] ?? $order->total ?? 0),
            'instruction'            => (string) ($context['instruction'] ?? $fulfillment->notes ?? ''),
        ];

        Log::info('courier.redx.book.request', [
            'order_number'   => $order->order_number,
            'fulfillment_id' => $fulfillment->id,
        ]);

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/parcel', $payload);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'RedX book request failed: '.$e->getMessage(),
                $this->slug(),
                ['order_number' => $order->order_number],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            Log::warning('courier.redx.book.failed', [
                'order_number' => $order->order_number,
                'status'       => $response->status(),
                'body'         => $response->body(),
            ]);
            throw new CourierGatewayException(
                'RedX book failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
                ['order_number' => $order->order_number],
            );
        }

        $raw = $response->json() ?? [];
        $trackingId = Arr::get($raw, 'tracking_id')
            ?? Arr::get($raw, 'data.tracking_id')
            ?? Arr::get($raw, 'parcel.tracking_id');

        return [
            'consignment_id'  => $trackingId,
            'tracking_number' => $trackingId ? (string) $trackingId : null,
            'tracking_url'    => $trackingId
                ? 'https://redx.com.bd/track-parcel/?trackingId='.rawurlencode((string) $trackingId)
                : null,
            'raw' => $raw,
        ];
    }

    public function track(string $trackingNumber): array
    {
        Log::info('courier.redx.track.request', ['tracking_number' => $trackingNumber]);

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->get($this->baseUrl().'/parcel/track/'.$trackingNumber);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'RedX track request failed: '.$e->getMessage(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'RedX track failed: HTTP '.$response->status(),
                $this->slug(),
                ['tracking_number' => $trackingNumber],
            );
        }

        $raw = $response->json() ?? [];
        $data = Arr::get($raw, 'data', $raw);

        return [
            'status' => (string) (Arr::get($data, 'status') ?? Arr::get($data, 'current_status') ?? 'unknown'),
            'events' => (array) (Arr::get($data, 'events', []) ?: Arr::get($data, 'history', [])),
            'raw'    => $raw,
        ];
    }

    public function cancel(string $consignmentId): array
    {
        Log::info('courier.redx.cancel.request', ['consignment_id' => $consignmentId]);

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->put($this->baseUrl().'/parcel/'.$consignmentId.'/cancel');
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'RedX cancel request failed: '.$e->getMessage(),
                $this->slug(),
                ['consignment_id' => $consignmentId],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'RedX cancel failed: HTTP '.$response->status().' '.$response->body(),
                $this->slug(),
                ['consignment_id' => $consignmentId],
            );
        }

        return $response->json() ?? [];
    }

    public function priceQuote(array $payload): array
    {
        try {
            $response = Http::withHeaders($this->authHeaders())
                ->timeout($this->timeout())
                ->post($this->baseUrl().'/pricing', $payload);
        } catch (Throwable $e) {
            throw new CourierGatewayException(
                'RedX price quote failed: '.$e->getMessage(),
                $this->slug(),
                [],
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            throw new CourierGatewayException(
                'RedX price quote failed: HTTP '.$response->status(),
                $this->slug(),
            );
        }

        return $response->json() ?? [];
    }

    protected function authHeaders(): array
    {
        return [
            'API-ACCESS-TOKEN' => 'Bearer '.($this->config['api_token'] ?? ''),
            'Content-Type'     => 'application/json',
            'Accept'           => 'application/json',
        ];
    }

    protected function baseUrl(): string
    {
        $isTestMode = (bool) ($this->config['is_test_mode'] ?? false);

        return rtrim($isTestMode
            ? ($this->config['sandbox_base_url'] ?? 'https://sandbox.redx.com.bd/v1.0.0-beta')
            : ($this->config['live_base_url'] ?? 'https://openapi.redx.com.bd/v1.0.0-beta'), '/');
    }

    protected function timeout(): int
    {
        return (int) ($this->config['timeout'] ?? config('couriers.default_timeout', 30));
    }
}
