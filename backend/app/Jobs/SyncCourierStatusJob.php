<?php

namespace App\Jobs;

use App\Models\OrderFulfillment;
use App\Services\Couriers\Gateways\PathaoGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Pull the latest courier status for a single OrderFulfillment and persist it.
 */
class SyncCourierStatusJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(public int $fulfillmentId)
    {
    }

    public function handle(): void
    {
        /** @var OrderFulfillment|null $fulfillment */
        $fulfillment = OrderFulfillment::find($this->fulfillmentId);

        if (! $fulfillment || ! $fulfillment->tracking_number) {
            return;
        }

        $gateway = $this->resolveGateway($fulfillment->carrier);
        if (! $gateway) {
            return;
        }

        try {
            $result = $gateway->track($fulfillment->tracking_number);

            $updates = [];
            if (! empty($result['status'])) {
                $updates['status'] = $result['status'];

                if ($result['status'] === 'delivered' && ! $fulfillment->delivered_at) {
                    $updates['delivered_at'] = now();
                }
            }

            if (! empty($updates)) {
                $fulfillment->fill($updates)->save();
            }
        } catch (\Throwable $e) {
            Log::warning('SyncCourierStatusJob failed', [
                'fulfillment_id' => $fulfillment->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function resolveGateway(?string $carrier)
    {
        return match ($carrier) {
            'pathao' => app(PathaoGateway::class),
            default => null,
        };
    }
}
