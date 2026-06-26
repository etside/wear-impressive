<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds an optional `video_url` to products. The vendor pastes a YouTube
 * link (watch?v=…, youtu.be/…, /shorts/…, or /embed/…) and the storefront
 * renders a "Watch Video" button that opens the embedded player in a
 * modal. Empty / null hides the button entirely.
 *
 * Idempotent — safe to re-run if a previous attempt failed partway.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'video_url')) {
                // After `external_url` so the two URL-style fields sit
                // together in the schema. Length 500 covers any realistic
                // YouTube URL with tracking params.
                $table->string('video_url', 500)->nullable()->after('external_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'video_url')) {
                $table->dropColumn('video_url');
            }
        });
    }
};
