<?php

namespace App\Events;

use App\Models\Order;
use App\Models\OrderFulfillment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderShipped
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order, public ?OrderFulfillment $fulfillment = null)
    {
    }
}
