<?php

namespace App\Listeners;

use App\Events\OrderCancelled;
use App\Mail\OrderCancelledMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendOrderCancelledEmail implements ShouldQueue
{
    public function handle(OrderCancelled $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store']);

        $to = $order->customer?->email ?? $order->guest_email;
        if (! $to) {
            return;
        }

        Mail::to($to)->queue(new OrderCancelledMail($order));

        try {
            (new OrderCancelledMail($order))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
