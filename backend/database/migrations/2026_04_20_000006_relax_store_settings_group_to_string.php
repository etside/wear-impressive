<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Relax store_settings.group from enum to string. Enum CHECK constraints on
 * SQLite block adding new groups (e.g. "theme" for theme activation + customizer
 * overrides) without a schema change each time. Validation stays at the request
 * layer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->string('group', 32)->default('general')->change();
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->enum('group', ['general', 'checkout', 'notifications', 'security', 'seo', 'branding'])
                ->default('general')
                ->change();
        });
    }
};
