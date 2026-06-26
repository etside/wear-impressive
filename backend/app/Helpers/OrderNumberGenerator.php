<?php

namespace App\Helpers;

use App\Models\Order;
use App\Models\ReturnRequest;

class OrderNumberGenerator
{
    /**
     * Generate the next order number for a store.
     *
     * Format: sequential numeric (1, 2, 3, ...).
     * Legacy ORD-XXXX orders coexist but are skipped in numbering.
     */
    public static function generate(int $storeId): string
    {
        // Find the highest purely-numeric order number for this store.
        // Legacy ORD-XXXX orders are ignored — they coexist but don't
        // participate in the new sequential numbering.
        $lastNumeric = Order::withTrashed()
            ->where('store_id', $storeId)
            ->orderByRaw('CAST(order_number AS UNSIGNED) DESC')
            ->first();

        $next = 1;

        if ($lastNumeric && $lastNumeric->order_number && ctype_digit($lastNumeric->order_number)) {
            $next = (int) $lastNumeric->order_number + 1;
        }

        return (string) $next;
    }

    /**
     * Generate the next return number for a store.
     *
     * Format: RET-XXXX (zero-padded, incremental per store).
     */
    public static function generateReturnNumber(int $storeId): string
    {
        $last = ReturnRequest::where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->first();

        $next = 1;

        if ($last && $last->return_number) {
            $suffix = (int) preg_replace('/\D/', '', substr($last->return_number, 4));
            $next = $suffix > 0 ? $suffix + 1 : 1;
        }

        return 'RET-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
