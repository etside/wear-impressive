<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The original orders.payment_method was an enum, which SQLite enforces via a
 * CHECK constraint and which blocks new providers (e.g. "manual" for
 * bKash/Nagad/Rocket send-money). Relaxing to string so vendors can add their
 * own payment providers without a schema change each time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method', 32)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('payment_method', [
                'bkash', 'nagad', 'sslcommerz', 'cod', 'stripe', 'cash', 'card', 'other',
            ])->nullable()->change();
        });
    }
};
