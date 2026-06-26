<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * SQLite enforces enum() as a CHECK constraint inline on the column,
 * so the previous migration's no-op SQLite path was wrong — INSERTs
 * with product_type='bundle' fail with a CHECK violation.
 *
 * This migration directly rewrites the constraint via writable_schema.
 * MySQL was already handled in the prior migration so this is SQLite-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        // Inspect the live CREATE TABLE statement so we don't hard-code
        // the exact CHECK syntax (Laravel's quoting can vary).
        $row = DB::selectOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
        if (! $row) {
            return;
        }

        $sql = $row->sql;
        // The original migration generated:
        //   "product_type" varchar check ("product_type" in ('physical', 'digital'))
        // Replace just that pair with the three-value version.
        $newSql = preg_replace(
            "/\\(\\s*\"product_type\"\\s+in\\s*\\(\\s*'physical'\\s*,\\s*'digital'\\s*\\)\\s*\\)/",
            "(\"product_type\" in ('physical', 'digital', 'bundle'))",
            $sql
        );

        if ($newSql === $sql) {
            // Already relaxed (or matched a different pattern) — nothing to do.
            return;
        }

        DB::statement('PRAGMA foreign_keys = OFF;');
        DB::statement('PRAGMA writable_schema = 1;');
        DB::statement(
            'UPDATE sqlite_master SET sql = ? WHERE type = ? AND name = ?',
            [$newSql, 'table', 'products']
        );
        DB::statement('PRAGMA writable_schema = 0;');
        DB::statement('PRAGMA foreign_keys = ON;');
        // Force SQLite to re-read the schema with the new constraint.
        DB::statement('VACUUM;');
    }

    public function down(): void
    {
        // Best-effort revert — same pattern in reverse.
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }
        $row = DB::selectOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
        if (! $row) {
            return;
        }
        $newSql = preg_replace(
            "/\\(\\s*\"product_type\"\\s+in\\s*\\(\\s*'physical'\\s*,\\s*'digital'\\s*,\\s*'bundle'\\s*\\)\\s*\\)/",
            "(\"product_type\" in ('physical', 'digital'))",
            $row->sql
        );
        DB::statement('PRAGMA foreign_keys = OFF;');
        DB::statement('PRAGMA writable_schema = 1;');
        DB::statement(
            'UPDATE sqlite_master SET sql = ? WHERE type = ? AND name = ?',
            [$newSql, 'table', 'products']
        );
        DB::statement('PRAGMA writable_schema = 0;');
        DB::statement('PRAGMA foreign_keys = ON;');
        DB::statement('VACUUM;');
    }
};
