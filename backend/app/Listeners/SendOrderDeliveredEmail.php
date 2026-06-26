<?php

namespace App\Listeners;

use App\Events\OrderDelivered;
use App\Mail\OrderDeliveredMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendOrderDeliveredEmail implements ShouldQueue
{
    public function handle(OrderDelivered $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store']);

        $to = $order->customer?->email ?? $order->guest_email;
        if (! $to) {
            return;
        }

        Mail::to($to)->queue(new OrderDeliveredMail($order));

        try {
            (new OrderDeliveredMail($order))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
