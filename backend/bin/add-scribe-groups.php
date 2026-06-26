<?php
/**
 * One-time script: inject a class-level `@group` PHPDoc into every API controller
 * so Scribe's generated docs sidebar groups endpoints logically.
 *
 * Usage:  php bin/add-scribe-groups.php
 * Idempotent: if a `@group` is already present on the class, the file is skipped.
 */

$mappings = [
    // path-prefix (under app/Http/Controllers/Api) => group label + optional subgroup
    'Admin/Auth'         => ['Super Admin', 'Auth'],
    'Admin'              => ['Super Admin', null],
    'Vendor/Auth'        => ['Vendor Dashboard', 'Auth'],
    'Vendor/Settings'    => ['Vendor Dashboard', 'Settings'],
    'Vendor'             => ['Vendor Dashboard', null],
    'Customer/Auth'      => ['Customer Account', 'Auth'],
    'Customer'           => ['Customer Account', null],
    'Staff/Auth'         => ['Staff Portal', 'Auth'],
    'Staff'              => ['Staff Portal', null],
    'Storefront'         => ['Storefront (Public)', null],
    // Webhook controllers are excluded from docs in config/scribe.php — skip them.
];

$base = __DIR__ . '/../app/Http/Controllers/Api';
$base = realpath($base);
if (! $base) {
    fwrite(STDERR, "Controllers dir not found\n");
    exit(1);
}

$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base));
$updated = 0;
$skipped = 0;
$unchanged = 0;

foreach ($it as $file) {
    if (! $file->isFile() || $file->getExtension() !== 'php') continue;
    $path = $file->getPathname();
    $rel = ltrim(str_replace('\\', '/', substr($path, strlen($base))), '/');

    // Skip webhooks.
    if (str_starts_with($rel, 'Webhook/')) {
        $skipped++;
        continue;
    }

    // Pick the most specific mapping (longest prefix wins).
    $match = null;
    $matchKey = '';
    foreach ($mappings as $prefix => $labels) {
        if (str_starts_with($rel, $prefix . '/') && strlen($prefix) > strlen($matchKey)) {
            $match = $labels;
            $matchKey = $prefix;
        }
    }
    if (! $match) {
        $skipped++;
        continue;
    }

    [$group, $subgroup] = $match;

    $src = file_get_contents($path);
    if ($src === false) continue;

    // Already has @group on class? Skip (idempotent).
    if (preg_match('/@group\s+\S/', $src)) {
        $unchanged++;
        continue;
    }

    $classLine = '/^(final\s+|abstract\s+)?class\s+\w+/m';
    if (! preg_match($classLine, $src, $m, PREG_OFFSET_CAPTURE)) {
        $skipped++;
        continue;
    }

    $pos = $m[0][1];
    // Don't double-up if the line above is already /** ... */ (merge into it).
    $before = substr($src, 0, $pos);
    $after = substr($src, $pos);

    $docblock = "/**\n * @group {$group}\n";
    if ($subgroup) {
        $docblock .= " * @subgroup {$subgroup}\n";
    }
    $docblock .= " */\n";

    // Remove any single blank line immediately before the class to keep layout tight.
    $before = rtrim($before) . "\n\n";

    file_put_contents($path, $before . $docblock . $after);
    $updated++;
    echo "  updated  {$rel}  →  {$group}" . ($subgroup ? " / {$subgroup}" : '') . "\n";
}

echo "\nDone. Updated: {$updated}  Unchanged: {$unchanged}  Skipped: {$skipped}\n";
