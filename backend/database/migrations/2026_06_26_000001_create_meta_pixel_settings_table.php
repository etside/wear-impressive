<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_pixel_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->unique()->constrained('stores')->cascadeOnDelete();
            $table->string('pixel_id')->nullable();
            $table->string('access_token')->nullable(); // Conversions API token
            $table->boolean('is_active')->default(false);
            $table->boolean('track_view_content')->default(true);
            $table->boolean('track_add_to_cart')->default(true);
            $table->boolean('track_initiate_checkout')->default(true);
            $table->boolean('track_purchase')->default(true);
            $table->boolean('use_conversions_api')->default(false);
            $table->string('test_event_code')->nullable(); // for CAPI test events
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_pixel_settings');
    }
};
