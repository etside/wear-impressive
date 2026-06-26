<?php

namespace App\Listeners;

use App\Events\OrderShipped;
use App\Mail\OrderShippedMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendOrderShippedEmail implements ShouldQueue
{
    public function handle(OrderShipped $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store', 'fulfillments']);

        $to = $order->customer?->email ?? $order->guest_email;
        if (! $to) {
            return;
        }

        Mail::to($to)->queue(new OrderShippedMail($order, $event->fulfillment));

        try {
            (new OrderShippedMail($order, $event->fulfillment))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
