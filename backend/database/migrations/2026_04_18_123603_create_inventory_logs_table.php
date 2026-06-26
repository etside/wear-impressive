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
        Schema::create('inventory_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->enum('type', ['sale', 'return', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'damaged']);
            $table->integer('change_qty');
            $table->integer('before_qty');
            $table->integer('after_qty');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->enum('user_type', ['vendor', 'staff', 'system'])->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'type']);
            $table->index(['product_id', 'variant_id']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_logs');
    }
};
