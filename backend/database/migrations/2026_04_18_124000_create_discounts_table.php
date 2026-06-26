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
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->enum('type', ['percentage', 'fixed', 'free_shipping', 'bogo'])->default('percentage');
            $table->decimal('value', 12, 2);
            $table->decimal('minimum_amount', 12, 2)->default(0);
            $table->decimal('maximum_discount', 12, 2)->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_per_customer')->nullable();
            $table->integer('used_count')->default(0);
            $table->timestamp('start_date');
            $table->timestamp('end_date');
            $table->boolean('is_active')->default(true);
            $table->enum('applies_to', ['all', 'products', 'collections', 'categories'])->default('all');
            $table->json('eligible_product_ids')->nullable();
            $table->json('eligible_collection_ids')->nullable();
            $table->json('eligible_category_ids')->nullable();
            $table->json('excluded_product_ids')->nullable();
            $table->enum('customer_eligibility', ['all', 'specific', 'segments'])->default('all');
            $table->json('eligible_customer_ids')->nullable();
            $table->json('eligible_segment_ids')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'code']);
            $table->index(['store_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discounts');
    }
};
