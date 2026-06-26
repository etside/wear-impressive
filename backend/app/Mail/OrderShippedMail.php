<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\OrderFulfillment;
use App\Models\Store;

class OrderShippedMail extends BaseStoreMail
{
    public function __construct(
        public Order $order,
        public ?OrderFulfillment $fulfillment = null,
        public ?Store $store = null,
    ) {
        $this->store = $store ?? $order->store;
        $this->fulfillment = $fulfillment ?? $order->fulfillments()->latest('id')->first();
    }

    protected function templateKey(): string
    {
        return 'shipping_notification';
    }

    protected function defaultView(): string
    {
        return 'emails.order-shipped';
    }

    protected function defaultSubject(): string
    {
        return 'Your order {{order_number}} has been shipped';
    }

    protected function placeholders(): array
    {
        $trackingNumber = $this->fulfillment?->tracking_number ?? '';
        $trackingUrl = $this->fulfillment?->tracking_url
            ?? ($trackingNumber ? url('/track/'.$trackingNumber) : '');
        $carrier = $this->fulfillment?->carrier ?? '';

        return [
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name ?? 'there',
            'order_number' => $this->order->order_number,
            'tracking_number' => $trackingNumber,
            'tracking_url' => $trackingUrl,
            'carrier_name' => ucfirst($carrier),
            'store_name' => $this->store?->name ?? '',
            'store_url' => $this->store?->domain ? 'https://'.$this->store->domain : url('/'),
        ];
    }

    protected function storeForTemplate(): ?Store
    {
        return $this->store;
    }

    protected function recipientEmail(): ?string
    {
        return $this->order->customer?->email ?? $this->order->guest_email;
    }
}
