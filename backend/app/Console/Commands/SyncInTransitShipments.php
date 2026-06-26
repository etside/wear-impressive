<?php

namespace App\Console\Commands;

use App\Jobs\SyncCourierStatusJob;
use App\Models\OrderFulfillment;
use Illuminate\Console\Command;

class SyncInTransitShipments extends Command
{
    protected $signature = 'wi:sync-in-transit';

    protected $description = 'Dispatch SyncCourierStatusJob for every shipment that has not yet been delivered.';

    public function handle(): int
    {
        $count = 0;

        OrderFulfillment::query()
            ->whereNotNull('tracking_number')
            ->whereNull('delivered_at')
            ->whereIn('status', ['shipped', 'in_transit', 'out_for_delivery'])
            ->chunkById(200, function ($fulfillments) use (&$count) {
                foreach ($fulfillments as $f) {
                    SyncCourierStatusJob::dispatch($f->id);
                    $count++;
                }
            });

        $this->info("Dispatched {$count} courier sync job(s).");

        return self::SUCCESS;
    }
}
