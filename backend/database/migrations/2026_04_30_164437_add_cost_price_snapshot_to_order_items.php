<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Frozen at order-placement time so profit reports stay correct
            // even if the product's cost changes later. Nullable because
            // pre-existing orders are backfilled with the product's current
            // cost as a best-effort starting point.
            $table->decimal('cost_price_snapshot', 12, 2)->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('cost_price_snapshot');
        });
    }
};
