<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track the last time the vendor changed their password. Powers the
     * security settings screen ("password strength" / "last changed" fields).
     */
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });
    }
};
