<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the store owner (Vendor) when a new order is placed.
 *
 * The schema of this project's `notifications` table diverges from Laravel's
 * default morphable notifications table (it uses an integer id, a constrained
 * `notifiable_type` enum, and a `store_id` column). Because of that, the
 * listener writes rows into `notifications` directly rather than using
 * Notifiable::notify(). This class still exists so the project can standardize
 * on the Notification shape (toArray etc.) and so it is trivial to switch to
 * Laravel's dispatcher once the table is migrated.
 */
class NewOrderNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'total' => $this->order->total,
            'currency' => $this->order->currency,
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name,
            'placed_at' => optional($this->order->created_at)->toIso8601String(),
        ];
    }
}
