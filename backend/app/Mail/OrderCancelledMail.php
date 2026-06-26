<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Store;

class OrderCancelledMail extends BaseStoreMail
{
    public function __construct(public Order $order, public ?Store $store = null)
    {
        $this->store = $store ?? $order->store;
    }

    protected function templateKey(): string
    {
        return 'order_cancelled';
    }

    protected function defaultView(): string
    {
        return 'emails.order-cancelled';
    }

    protected function defaultSubject(): string
    {
        return 'Your order {{order_number}} has been cancelled';
    }

    protected function placeholders(): array
    {
        return [
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name ?? 'there',
            'order_number' => $this->order->order_number,
            'reason' => $this->order->cancelled_reason ?? 'No reason provided.',
            'total' => number_format((float) $this->order->total, 2),
            'currency' => $this->order->currency,
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
