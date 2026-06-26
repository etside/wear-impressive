<?php

namespace App\Listeners;

use App\Events\OrderConfirmed;
use App\Services\Sms\GennetSmsService;

/**
 * Sends a Bangla confirmation SMS to the customer the moment a vendor
 * confirms their order. Runs synchronously (no queue) so the message
 * goes out even without a queue worker; GennetSmsService swallows all
 * gateway errors so the confirm action itself can never fail.
 */
class SendOrderConfirmedSms
{
    public function __construct(protected GennetSmsService $sms)
    {
    }

    public function handle(OrderConfirmed $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store']);

        $phone = $order->customer?->phone ?? $order->guest_phone;
        if (! $phone) {
            return;
        }

        $storeName = $order->store?->name ?? 'Wear Impressive';
        $total = number_format((float) $order->total, 0);

        $message = sprintf(
            'প্রিয় গ্রাহক, আপনার অর্ডার %s নিশ্চিত করা হয়েছে। মোট মূল্য: %s টাকা। %s-এর সাথে থাকার জন্য ধন্যবাদ।',
            $order->order_number,
            $total,
            $storeName,
        );

        $this->sms->send((int) $order->store_id, $phone, $message);
    }
}
