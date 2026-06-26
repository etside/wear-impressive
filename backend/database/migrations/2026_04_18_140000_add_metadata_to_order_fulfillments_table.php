<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('order_fulfillments', 'metadata')) {
            Schema::table('order_fulfillments', function (Blueprint $table) {
                $table->json('metadata')->nullable()->after('notes');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_fulfillments', 'metadata')) {
            Schema::table('order_fulfillments', function (Blueprint $table) {
                $table->dropColumn('metadata');
            });
        }
    }
};
