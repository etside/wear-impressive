<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeExpiredTokens extends Command
{
    protected $signature = 'wi:purge-tokens';

    protected $description = 'Delete Sanctum personal access tokens older than 30 days that were never used.';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);

        $deleted = DB::table('personal_access_tokens')
            ->whereNull('last_used_at')
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Deleted {$deleted} stale personal access token(s).");

        return self::SUCCESS;
    }
}
