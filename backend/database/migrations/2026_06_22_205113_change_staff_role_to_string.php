<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `staff.role` was a MySQL ENUM('manager','cashier','inventory'), but the
     * Roles & Permissions feature now stores arbitrary lowercased role names
     * (the default "Staff" role, plus any vendor-created custom role). Any
     * value outside the enum truncates and throws a fatal DB error on save.
     * SQLite never enforced the enum (it's already a plain varchar there),
     * which is why this only broke on the live MySQL database.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE staff MODIFY role VARCHAR(50) NOT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE staff MODIFY role ENUM('manager','cashier','inventory') NOT NULL");
        }
    }
};
