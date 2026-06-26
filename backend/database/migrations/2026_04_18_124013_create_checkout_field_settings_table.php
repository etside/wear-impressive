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
        Schema::create('checkout_field_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('field_key');
            $table->enum('field_type', ['text', 'number', 'email', 'phone', 'url', 'select', 'radio', 'checkbox', 'date', 'textarea', 'attachment'])->default('text');
            $table->string('label')->nullable();
            $table->string('placeholder')->nullable();
            $table->json('options')->nullable();
            $table->enum('requirement', ['hidden', 'optional', 'required'])->default('optional');
            $table->boolean('is_custom')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['store_id', 'field_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkout_field_settings');
    }
};
