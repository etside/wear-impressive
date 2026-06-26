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
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('password');
            $table->string('name');
            $table->string('avatar')->nullable();
            $table->enum('role', ['manager', 'cashier', 'inventory']);
            $table->json('permissions')->nullable();
            $table->foreignId('invited_by')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('invitation_token')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
