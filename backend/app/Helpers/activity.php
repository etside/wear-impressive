<?php

use App\Services\ActivityLogger;

if (! function_exists('activity')) {
    /**
     * Fluent helper to start an activity log entry.
     *
     *   activity('order')
     *       ->performedOn($order)
     *       ->withProperties(['total' => $order->total])
     *       ->event('placed')
     *       ->log('Order placed');
     */
    function activity(?string $logName = null): ActivityLogger
    {
        $logger = app(ActivityLogger::class);
        if ($logName) {
            $logger->useLog($logName);
        }

        return $logger;
    }
}
