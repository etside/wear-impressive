<?php

namespace App\Services\Couriers\Contracts;

use App\Models\OrderFulfillment;

interface CourierGateway
{
    /**
     * Book a shipment with the courier.
     *
     * @return array{consignment_id: string|int|null, tracking_number: string|null, tracking_url: string|null, raw: array}
     */
    public function bookShipment(OrderFulfillment $fulfillment, array $context = []): array;

    /**
     * Fetch tracking status + events for a tracking number.
     *
     * @return array{status: string, events: array<int, array>, raw: array}
     */
    public function track(string $trackingNumber): array;

    /**
     * Cancel a previously booked shipment.
     *
     * @return array
     */
    public function cancel(string $consignmentId): array;

    /**
     * Quote a delivery price for a prospective shipment.
     *
     * @return array
     */
    public function priceQuote(array $payload): array;

    /**
     * Machine-readable slug of this courier (e.g. "pathao", "steadfast").
     */
    public function slug(): string;
}
