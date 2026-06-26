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
        Schema::create('order_fulfillments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('tracking_number')->nullable();
            $table->enum('carrier', ['pathao', 'steadfast', 'redx', 'sundarban', 'paperfly', 'self', 'other'])->nullable();
            $table->string('tracking_url')->nullable();
            $table->enum('status', ['pending', 'packed', 'shipped', 'in_transit', 'delivered', 'failed'])->default('pending');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->date('estimated_delivery')->nullable();
            $table->decimal('weight', 8, 3)->nullable();
            $table->decimal('shipping_cost', 12, 2)->nullable();
            $table->decimal('cod_amount', 12, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index('tracking_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_fulfillments');
    }
};
