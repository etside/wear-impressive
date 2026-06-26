<?php

namespace App\Listeners;

use App\Events\PaymentReceived;
use App\Mail\PaymentReceivedMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendPaymentReceivedEmail implements ShouldQueue
{
    public function handle(PaymentReceived $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store']);

        $to = $order->customer?->email ?? $order->guest_email;
        if (! $to) {
            return;
        }

        Mail::to($to)->queue(new PaymentReceivedMail($order));

        try {
            (new PaymentReceivedMail($order))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
