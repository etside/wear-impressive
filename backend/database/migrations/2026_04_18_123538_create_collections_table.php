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
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->enum('type', ['manual', 'automatic'])->default('manual');
            $table->json('conditions')->nullable(); // for automatic collections
            $table->enum('status', ['active', 'draft'])->default('draft');
            $table->unsignedInteger('product_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'slug']);
            $table->index(['store_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
