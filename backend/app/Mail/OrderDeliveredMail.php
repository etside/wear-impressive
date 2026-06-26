<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Store;

class OrderDeliveredMail extends BaseStoreMail
{
    public function __construct(public Order $order, public ?Store $store = null)
    {
        $this->store = $store ?? $order->store;
    }

    protected function templateKey(): string
    {
        return 'delivery_confirmation';
    }

    protected function defaultView(): string
    {
        return 'emails.order-delivered';
    }

    protected function defaultSubject(): string
    {
        return 'Your order {{order_number}} has been delivered';
    }

    protected function placeholders(): array
    {
        return [
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name ?? 'there',
            'order_number' => $this->order->order_number,
            'review_url' => url('/orders/'.$this->order->order_number.'/review'),
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
