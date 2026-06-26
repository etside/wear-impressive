<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->integer('balance')->default(0);
            $table->integer('total_earned')->default(0);
            $table->integer('total_redeemed')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_accounts');
    }
};
