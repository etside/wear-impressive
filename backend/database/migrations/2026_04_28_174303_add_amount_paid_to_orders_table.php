<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `amount_paid` is the running total of money the vendor has actually
 * received against an order. Combined with the existing `total`,
 * `advance_amount`, and `cod_amount` columns it lets the dashboard show
 * partial payments accurately:
 *
 *   amount_outstanding = total - amount_paid
 *   advance_settled    = amount_paid >= advance_amount
 *   fully_paid         = amount_paid >= total
 *
 * Backfill: existing orders where payment_status = 'paid' get
 * amount_paid = total (so historical revenue charts don't shift).
 * Everything else gets 0.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('amount_paid', 12, 2)->default(0)->after('cod_amount');
        });

        // Backfill historical rows so existing reports remain stable.
        DB::table('orders')
            ->where('payment_status', 'paid')
            ->update(['amount_paid' => DB::raw('total')]);

        DB::table('orders')
            ->where('payment_status', 'partial')
            ->whereNotNull('advance_amount')
            ->update(['amount_paid' => DB::raw('advance_amount')]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('amount_paid');
        });
    }
};
