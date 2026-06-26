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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('product_categories')->cascadeOnDelete();
            $table->foreignId('sub_category_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();

            $table->enum('product_type', ['physical', 'digital'])->default('physical');
            $table->string('name');
            $table->string('slug');
            $table->string('short_description', 500)->nullable();
            $table->longText('description')->nullable();

            // Pricing
            $table->decimal('price', 12, 2);
            $table->decimal('discount', 12, 2)->nullable();
            $table->enum('discount_type', ['flat', 'percent'])->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();

            // Identifiers
            $table->string('sku')->nullable()->unique();
            $table->string('barcode')->nullable()->unique();

            // Physical attributes
            $table->decimal('weight_value', 8, 3)->nullable();
            $table->enum('weight_unit', ['g', 'kg', 'lb', 'oz'])->default('kg');

            // Inventory
            $table->boolean('has_variants')->default(false);
            $table->boolean('track_inventory')->default(true);
            $table->integer('stock')->default(0);
            $table->integer('low_stock_threshold')->default(5);

            // Media
            $table->json('images')->nullable();
            $table->string('featured_image')->nullable();
            $table->string('cover_image')->nullable();

            // SEO & tags
            $table->json('tags')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('url_handle')->nullable();

            $table->enum('status', ['draft', 'active', 'archived'])->default('draft');

            // Digital product fields
            $table->string('digital_file_path')->nullable();
            $table->string('digital_file_name')->nullable();
            $table->bigInteger('digital_file_size')->nullable();
            $table->integer('download_limit')->nullable();
            $table->integer('download_expiry_days')->nullable();
            $table->string('external_url')->nullable();

            // Tax
            $table->boolean('is_taxable')->default(false);
            $table->decimal('tax_rate', 5, 2)->default(0);

            $table->timestamp('published_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'slug']);
            $table->index(['store_id', 'category_id']);
            $table->index(['store_id', 'brand_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
