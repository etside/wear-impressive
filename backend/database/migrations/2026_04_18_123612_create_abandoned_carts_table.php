<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('abandoned_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('guest_email')->nullable();
            $table->string('guest_phone')->nullable();
            $table->json('items');
            $table->decimal('total', 12, 2);
            $table->string('recovery_token')->unique();
            $table->timestamp('recovered_at')->nullable();
            $table->timestamp('recovery_email_sent_at')->nullable();
            $table->foreignId('recovery_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamp('last_activity_at');
            $table->timestamps();

            $table->index(['store_id', 'customer_id']);
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('abandoned_carts');
    }
};
