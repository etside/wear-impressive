<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Members created phone-only by the vendor have no email, so the column
 * must allow NULL. The composite unique (store_id, email) still holds —
 * SQLite and MySQL both permit multiple NULLs under a unique index.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};
