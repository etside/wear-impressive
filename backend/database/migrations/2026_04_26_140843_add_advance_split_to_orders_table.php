<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the advance/COD split frozen at checkout time so reports stay
 * accurate even if the vendor's policy changes later. Both columns are
 * nullable so legacy orders (placed before this feature) read as null and
 * the rest of the code can fall back to legacy COD-vs-prepaid behaviour
 * via the existing `payment_status` field.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('advance_amount', 12, 2)->nullable()->after('total');
            $table->decimal('cod_amount', 12, 2)->nullable()->after('advance_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['advance_amount', 'cod_amount']);
        });
    }
};
