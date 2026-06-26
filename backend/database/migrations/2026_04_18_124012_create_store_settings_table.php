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
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('key');
            $table->text('value')->nullable();
            $table->enum('type', ['string', 'boolean', 'integer', 'decimal', 'json'])->default('string');
            $table->enum('group', ['general', 'checkout', 'notifications', 'security', 'seo', 'branding'])->default('general');
            $table->timestamps();

            $table->unique(['store_id', 'key']);
            $table->index(['store_id', 'group']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
