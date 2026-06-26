<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Mail\OrderPlacedMail;
use App\Models\Notification;
use App\Models\Vendor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendOrderPlacedEmail implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        $order = $event->order->loadMissing(['customer', 'store', 'items']);

        $to = $order->customer?->email ?? $order->guest_email;

        if ($to) {
            Mail::to($to)->queue(new OrderPlacedMail($order));

            // Record the queue dispatch in email_logs. The Mailable's failed()
            // hook will overwrite with a 'failed' entry if delivery blows up.
            try {
                (new OrderPlacedMail($order))->logEmail('sent');
            } catch (\Throwable $e) {
                // ignore
            }
        }

        $this->notifyVendors($order);
    }

    protected function notifyVendors($order): void
    {
        // Write a row into the project's custom `notifications` table for each
        // vendor (store owner) on this store.
        $vendors = Vendor::query()
            ->where('store_id', $order->store_id)
            ->get();

        foreach ($vendors as $vendor) {
            Notification::create([
                'store_id' => $order->store_id,
                'notifiable_type' => 'vendor',
                'notifiable_id' => $vendor->id,
                'type' => 'order.placed',
                'title' => 'New order '.$order->order_number,
                'message' => sprintf(
                    '%s placed an order for %s %s',
                    $order->customer?->name ?? $order->guest_name ?? 'Guest',
                    number_format((float) $order->total, 2),
                    $order->currency
                ),
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'total' => $order->total,
                    'currency' => $order->currency,
                ],
                'action_url' => '/vendor/orders/'.$order->id,
            ]);
        }
    }
}
