<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'payment_gateway_reference')) {
                $table->text('payment_gateway_reference')->nullable()->after('payment_reference');
            }
            if (! Schema::hasColumn('orders', 'payment_response')) {
                $table->json('payment_response')->nullable()->after('payment_gateway_reference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'payment_response')) {
                $table->dropColumn('payment_response');
            }
            if (Schema::hasColumn('orders', 'payment_gateway_reference')) {
                $table->dropColumn('payment_gateway_reference');
            }
        });
    }
};
