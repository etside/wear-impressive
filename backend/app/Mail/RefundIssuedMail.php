<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Store;

class RefundIssuedMail extends BaseStoreMail
{
    public function __construct(
        public Order $order,
        public float $refundAmount,
        public ?Store $store = null,
    ) {
        $this->store = $store ?? $order->store;
    }

    protected function templateKey(): string
    {
        return 'refund_issued';
    }

    protected function defaultView(): string
    {
        return 'emails.refund-issued';
    }

    protected function defaultSubject(): string
    {
        return 'Refund issued for order {{order_number}}';
    }

    protected function placeholders(): array
    {
        return [
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name ?? 'there',
            'order_number' => $this->order->order_number,
            'refund_amount' => number_format($this->refundAmount, 2),
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
