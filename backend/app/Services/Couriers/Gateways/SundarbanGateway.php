<?php

namespace App\Services\Couriers\Gateways;

use App\Exceptions\CourierNotImplementedException;
use App\Models\OrderFulfillment;
use App\Services\Couriers\Contracts\CourierGateway;

/**
 * Sundarban Courier — stub.
 *
 * Sundarban does not publish an official public REST API for merchants as of
 * the integration date. Until they expose one (or we onboard a reseller
 * aggregator), all methods throw {@see CourierNotImplementedException}.
 */
class SundarbanGateway implements CourierGateway
{
    protected array $config;

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function slug(): string
    {
        return 'sundarban';
    }

    public function bookShipment(OrderFulfillment $fulfillment, array $context = []): array
    {
        throw new CourierNotImplementedException(
            'Sundarban Courier does not expose a public API for programmatic booking. Please book manually via Sundarban portal and record the tracking number via the fulfillment update endpoint.',
            $this->slug(),
        );
    }

    public function track(string $trackingNumber): array
    {
        throw new CourierNotImplementedException(
            'Sundarban Courier does not expose a public tracking API.',
            $this->slug(),
            ['tracking_number' => $trackingNumber],
        );
    }

    public function cancel(string $consignmentId): array
    {
        throw new CourierNotImplementedException(
            'Sundarban Courier does not expose a public cancellation API.',
            $this->slug(),
            ['consignment_id' => $consignmentId],
        );
    }

    public function priceQuote(array $payload): array
    {
        throw new CourierNotImplementedException(
            'Sundarban Courier does not expose a public pricing API.',
            $this->slug(),
        );
    }
}
