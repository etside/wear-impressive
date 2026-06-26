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
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('handle')->unique(); // subdomain slug
            $table->string('custom_domain')->nullable()->unique();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('country')->default('BD');
            $table->string('currency', 8)->default('BDT');
            $table->string('timezone')->default('Asia/Dhaka');
            $table->enum('primary_language', ['en', 'bn', 'both'])->default('both');
            $table->string('logo')->nullable();
            $table->string('favicon')->nullable();
            $table->text('description')->nullable();

            // Address
            $table->string('address_line_1')->nullable();
            $table->string('division')->nullable();
            $table->string('district')->nullable();
            $table->string('thana')->nullable();
            $table->string('postal_code')->nullable();

            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->enum('plan', ['free', 'basic', 'pro'])->default('free');
            $table->timestamp('trial_ends_at')->nullable();
            $table->boolean('onboarding_completed')->default(false);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
