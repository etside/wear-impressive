<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds support for "bundle" / combo products that reference one or more
 * existing products as components. The bundle is itself a product row in
 * `products` (just with product_type = 'bundle' and a chosen pricing
 * strategy) — its components live in product_bundle_components.
 *
 * cart_items / order_items get a `parent_*_item_id` column so a bundle
 * line can own N child component rows. The parent row carries the bundle
 * price; child rows carry product/variant identity for stock decrement
 * and display only (price_snapshot=0 on children).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Idempotent — safe to re-run if a previous attempt died partway.
        // We check each piece against the live schema before applying.

        // 1. Allow product_type = 'bundle'. MySQL strictly enforces the enum;
        //    SQLite stores enum as TEXT (the older relax_product_type_check
        //    migration handles it there).
        if (DB::connection()->getDriverName() === 'mysql') {
            $row = DB::selectOne("SHOW COLUMNS FROM products LIKE 'product_type'");
            if ($row && stripos($row->Type ?? '', "'bundle'") === false) {
                DB::statement("ALTER TABLE products MODIFY product_type ENUM('physical','digital','bundle') NOT NULL DEFAULT 'physical'");
            }
        }

        // 2. Bundle pricing fields on products.
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'bundle_pricing_strategy')) {
                $table->string('bundle_pricing_strategy', 16)->nullable()->after('discount_type');
            }
            if (! Schema::hasColumn('products', 'bundle_price')) {
                $table->decimal('bundle_price', 12, 2)->nullable()->after('bundle_pricing_strategy');
            }
            if (! Schema::hasColumn('products', 'bundle_discount_percent')) {
                $table->decimal('bundle_discount_percent', 5, 2)->nullable()->after('bundle_price');
            }
            if (! Schema::hasColumn('products', 'bundle_compare_at_price')) {
                $table->decimal('bundle_compare_at_price', 12, 2)->nullable()->after('bundle_discount_percent');
            }
        });

        // 3. The bundle <-> component mapping table.
        if (! Schema::hasTable('product_bundle_components')) {
            Schema::create('product_bundle_components', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bundle_product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('component_product_id')->constrained('products')->restrictOnDelete();
                $table->unsignedInteger('quantity')->default(1);
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_required')->default(true);
                $table->timestamps();
                // Explicit short names — Laravel's auto-generated identifier
                // (table + columns + suffix) exceeds MySQL's 64-char limit.
                $table->unique(['bundle_product_id', 'component_product_id'], 'pbc_bundle_component_uq');
                $table->index('bundle_product_id', 'pbc_bundle_idx');
            });
        } else {
            // Table already exists from a partial earlier attempt — make sure
            // the unique + index are present (they were the failing piece).
            $hasUq = DB::selectOne(
                "SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = 'product_bundle_components'
                   AND index_name = 'pbc_bundle_component_uq' LIMIT 1"
            );
            if (! $hasUq) {
                DB::statement('ALTER TABLE product_bundle_components ADD UNIQUE pbc_bundle_component_uq (bundle_product_id, component_product_id)');
            }
            $hasIdx = DB::selectOne(
                "SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = 'product_bundle_components'
                   AND index_name = 'pbc_bundle_idx' LIMIT 1"
            );
            if (! $hasIdx) {
                DB::statement('ALTER TABLE product_bundle_components ADD INDEX pbc_bundle_idx (bundle_product_id)');
            }
        }

        // 4. cart_items: parent_cart_item_id links child component rows to
        //    the bundle parent row.
        Schema::table('cart_items', function (Blueprint $table) {
            if (! Schema::hasColumn('cart_items', 'parent_cart_item_id')) {
                $table->foreignId('parent_cart_item_id')
                    ->nullable()
                    ->after('variant_id')
                    ->constrained('cart_items')
                    ->cascadeOnDelete();
                $table->index('parent_cart_item_id');
            }
        });

        // 5. order_items: parent_order_item_id (same pattern as cart).
        Schema::table('order_items', function (Blueprint $table) {
            if (! Schema::hasColumn('order_items', 'parent_order_item_id')) {
                $table->foreignId('parent_order_item_id')
                    ->nullable()
                    ->after('variant_id')
                    ->constrained('order_items')
                    ->cascadeOnDelete();
                $table->index('parent_order_item_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['parent_order_item_id']);
            $table->dropIndex(['parent_order_item_id']);
            $table->dropColumn('parent_order_item_id');
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropForeign(['parent_cart_item_id']);
            $table->dropIndex(['parent_cart_item_id']);
            $table->dropColumn('parent_cart_item_id');
        });

        Schema::dropIfExists('product_bundle_components');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'bundle_pricing_strategy',
                'bundle_price',
                'bundle_discount_percent',
                'bundle_compare_at_price',
            ]);
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE products MODIFY product_type ENUM('physical','digital') NOT NULL DEFAULT 'physical'");
        }
    }
};
