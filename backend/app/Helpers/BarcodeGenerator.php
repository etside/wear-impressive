<?php

namespace App\Helpers;

use App\Models\Product;
use App\Models\ProductVariant;

class BarcodeGenerator
{
    /**
     * Generate a valid EAN-13 barcode with prefix "880" (Bangladesh GS1 country code).
     *
     * Format: [prefix 3][store 4][sequence 5][check 1] = 13 digits
     */
    public static function ean13(?int $storeId = null): string
    {
        $prefix = '880';
        $store = str_pad((string) (($storeId ?? 1) % 10000), 4, '0', STR_PAD_LEFT);

        // Try up to 5 times to generate a unique barcode
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $seq = str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);
            $base = $prefix.$store.$seq;
            $barcode = $base.self::calculateEan13CheckDigit($base);

            if (! Product::withTrashed()->where('barcode', $barcode)->exists()
                && ! ProductVariant::where('barcode', $barcode)->exists()) {
                return $barcode;
            }
        }

        // Fallback: append microtime to guarantee uniqueness (still 13 digits)
        $seq = str_pad((string) (microtime(true) * 1000 % 100000), 5, '0', STR_PAD_LEFT);
        $base = $prefix.$store.$seq;

        return $base.self::calculateEan13CheckDigit($base);
    }

    /**
     * Calculate the EAN-13 check digit for the given 12-digit base.
     */
    public static function calculateEan13CheckDigit(string $base12): string
    {
        $digits = array_map('intval', str_split($base12));
        $sum = 0;

        foreach ($digits as $i => $v) {
            $sum += $v * ($i % 2 === 0 ? 1 : 3);
        }

        $check = (10 - ($sum % 10)) % 10;

        return (string) $check;
    }
}
