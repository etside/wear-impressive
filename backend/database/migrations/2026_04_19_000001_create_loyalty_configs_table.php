<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->unique()->constrained('stores')->cascadeOnDelete();
            $table->boolean('is_active')->default(false);
            $table->decimal('spend_amount_for_points', 12, 2)->default(100);
            $table->integer('points_per_spend')->default(1);
            $table->decimal('redemption_value', 12, 2)->default(1);
            $table->integer('min_redemption_points')->default(50);
            $table->integer('points_expiry_days')->nullable();
            $table->integer('welcome_bonus_points')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_configs');
    }
};
