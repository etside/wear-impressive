<?php

namespace App\Services\Couriers\Gateways;

use App\Exceptions\CourierNotImplementedException;
use App\Models\OrderFulfillment;
use App\Services\Couriers\Contracts\CourierGateway;

/**
 * Paperfly — stub.
 *
 * Paperfly exposes an integration API only under a signed NDA / partner
 * agreement, with credentials issued per merchant. Until those credentials
 * and endpoint docs are in hand, all methods throw
 * {@see CourierNotImplementedException}.
 */
class PaperflyGateway implements CourierGateway
{
    protected array $config;

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function slug(): string
    {
        return 'paperfly';
    }

    public function bookShipment(OrderFulfillment $fulfillment, array $context = []): array
    {
        throw new CourierNotImplementedException(
            'Paperfly integration requires an NDA-gated merchant API agreement. Please book manually and record the tracking number via the fulfillment update endpoint.',
            $this->slug(),
        );
    }

    public function track(string $trackingNumber): array
    {
        throw new CourierNotImplementedException(
            'Paperfly public tracking API is not available; requires merchant NDA.',
            $this->slug(),
            ['tracking_number' => $trackingNumber],
        );
    }

    public function cancel(string $consignmentId): array
    {
        throw new CourierNotImplementedException(
            'Paperfly cancellation API is not publicly available.',
            $this->slug(),
            ['consignment_id' => $consignmentId],
        );
    }

    public function priceQuote(array $payload): array
    {
        throw new CourierNotImplementedException(
            'Paperfly pricing API is not publicly available.',
            $this->slug(),
        );
    }
}
