<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('wi:mark-abandoned-carts')->hourly();
Schedule::command('wi:send-abandoned-recovery')->hourly();
Schedule::command('wi:purge-tokens')->daily();
Schedule::command('wi:release-held-inventory')->dailyAt('03:00');
Schedule::command('wi:sync-in-transit')->everyFifteenMinutes();
