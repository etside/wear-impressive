<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Store;

class OrderPlacedMail extends BaseStoreMail
{
    public function __construct(public Order $order, public ?Store $store = null)
    {
        $this->store = $store ?? $order->store;
    }

    protected function templateKey(): string
    {
        return 'order_confirmation';
    }

    protected function defaultView(): string
    {
        return 'emails.order-placed';
    }

    protected function defaultSubject(): string
    {
        return 'Your order {{order_number}} has been confirmed';
    }

    protected function placeholders(): array
    {
        $customerName = $this->order->customer?->name
            ?? $this->order->guest_name
            ?? 'there';

        return [
            'customer_name' => $customerName,
            'order_number' => $this->order->order_number,
            'order_total' => number_format((float) $this->order->total, 2).' '.$this->order->currency,
            'total' => number_format((float) $this->order->total, 2),
            'currency' => $this->order->currency,
            'order_url' => url('/orders/'.$this->order->order_number),
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
