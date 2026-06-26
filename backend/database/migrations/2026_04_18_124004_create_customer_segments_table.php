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
        Schema::create('customer_segments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('conditions')->nullable();
            $table->enum('condition_match', ['all', 'any'])->default('all');
            $table->boolean('is_system')->default(false);
            $table->integer('customer_count')->default(0);
            $table->string('icon')->nullable();
            $table->char('color', 7)->nullable();
            $table->timestamp('last_calculated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'is_system']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_segments');
    }
};
