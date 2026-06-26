<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vendor-defined extra tabs that render on the product detail page after
 * the always-on Description tab. Each tab carries a bilingual name and
 * bilingual rich-text content; storefront picks per current language and
 * falls back to English when a Bangla field is blank.
 *
 * Schema (JSON array stored in this column):
 *   [
 *     { "name_en": "Shipping", "name_bn": "...", "content_en": "<p>...</p>", "content_bn": "<p>...</p>" },
 *     ...
 *   ]
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('custom_tabs')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('custom_tabs');
        });
    }
};
