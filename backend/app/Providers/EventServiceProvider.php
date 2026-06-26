<?php

namespace App\Providers;

use App\Events\CustomerRegistered;
use App\Events\OrderCancelled;
use App\Events\OrderConfirmed;
use App\Events\OrderDelivered;
use App\Events\OrderPlaced;
use App\Events\OrderShipped;
use App\Events\PaymentReceived;
use App\Events\StaffInvited;
use App\Listeners\EarnLoyaltyOnDelivery;
use App\Listeners\SendOrderCancelledEmail;
use App\Listeners\SendOrderConfirmedSms;
use App\Listeners\SendOrderDeliveredEmail;
use App\Listeners\SendOrderPlacedEmail;
use App\Listeners\SendOrderShippedEmail;
use App\Listeners\SendPaymentReceivedEmail;
use App\Listeners\SendStaffInviteEmail;
use App\Listeners\SendWelcomeCustomerEmail;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        OrderPlaced::class => [
            SendOrderPlacedEmail::class,
        ],
        OrderConfirmed::class => [
            SendOrderConfirmedSms::class,
        ],
        OrderShipped::class => [
            SendOrderShippedEmail::class,
        ],
        OrderDelivered::class => [
            SendOrderDeliveredEmail::class,
            EarnLoyaltyOnDelivery::class,
        ],
        OrderCancelled::class => [
            SendOrderCancelledEmail::class,
        ],
        PaymentReceived::class => [
            SendPaymentReceivedEmail::class,
        ],
        CustomerRegistered::class => [
            SendWelcomeCustomerEmail::class,
        ],
        StaffInvited::class => [
            SendStaffInviteEmail::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Disable event auto-discovery so only the explicit mapping is used.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
