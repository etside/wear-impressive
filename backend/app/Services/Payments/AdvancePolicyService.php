<?php

namespace App\Services\Payments;

use App\Models\Store;
use App\Models\StoreSetting;

/**
 * Computes how much of an order the customer must prepay (advance) versus
 * how much the courier collects on delivery (COD), based on the vendor's
 * advance-payment policy.
 *
 * Modes:
 *  - none             : full COD, no advance.
 *  - delivery_charge  : advance = shipping fee, rest is COD.
 *  - percentage       : advance = N% of (subtotal - discount), rest is COD.
 *  - full             : advance = total, no COD.
 *
 * Only applies when the customer pays via the manual bKash/Nagad/Rocket
 * method. Online gateways always charge the full total upfront, and explicit
 * full-COD orders skip this calculator.
 */
class AdvancePolicyService
{
    public const MODE_NONE = 'none';
    public const MODE_DELIVERY_CHARGE = 'delivery_charge';
    public const MODE_PERCENTAGE = 'percentage';
    public const MODE_FULL = 'full';

    /**
     * Returns ['advance' => float, 'cod' => float] given the cart math + the
     * payment method. The two always sum to $total.
     *
     * @param  Store  $store
     * @param  float  $subtotal      Items only, before any discount.
     * @param  float  $discount      Coupon/promo amount applied to subtotal.
     * @param  float  $shipping      Shipping fee.
     * @param  float  $total         Final amount the customer owes.
     * @param  string|null  $paymentMethod  Lowercased gateway key (manual / cod / bkash / sslcommerz / ...).
     * @return array{advance: float, cod: float, mode: string}
     */
    public function compute(
        Store $store,
        float $subtotal,
        float $discount,
        float $shipping,
        float $total,
        ?string $paymentMethod
    ): array {
        $method = strtolower((string) $paymentMethod);
        $config = $this->loadConfig($store->id);

        // Cash-on-delivery is full COD by definition. Nothing to advance.
        if ($method === 'cod' || $method === 'cash') {
            return ['advance' => 0.0, 'cod' => round($total, 2), 'mode' => self::MODE_NONE];
        }

        // Online gateways collect the whole amount upfront — no COD remainder.
        // Manual bKash/Nagad/Rocket is the only method that splits.
        if ($method !== 'manual') {
            return ['advance' => round($total, 2), 'cod' => 0.0, 'mode' => self::MODE_FULL];
        }

        $mode = $config['mode'];
        $advance = match ($mode) {
            self::MODE_DELIVERY_CHARGE => $shipping,
            self::MODE_PERCENTAGE      => max(0, $subtotal - $discount) * ($config['percentage'] / 100),
            self::MODE_FULL            => $total,
            default                    => 0.0, // 'none' or unknown
        };

        // Round to the vendor's preferred unit so the customer pays a clean
        // ৳-friendly number (e.g. ৳450 not ৳437.20).
        $advance = $this->roundTo($advance, $config['round_to']);

        // Floor + cap so corner cases don't produce nonsense advances.
        if ($advance > 0 && $advance < $config['floor']) {
            $advance = 0.0;
        }
        if ($advance > $total) {
            $advance = $total;
        }

        $cod = max(0, $total - $advance);

        return [
            'advance' => round($advance, 2),
            'cod'     => round($cod, 2),
            'mode'    => $mode,
        ];
    }

    /**
     * Reads the vendor's advance policy from store settings, with sensible
     * defaults for stores that haven't configured it yet (= full COD, no
     * behaviour change).
     *
     * @return array{mode: string, percentage: int, round_to: int, floor: int}
     */
    public function loadConfig(int $storeId): array
    {
        $rows = StoreSetting::query()
            ->where('store_id', $storeId)
            ->whereIn('key', [
                'payment.advance_mode',
                'payment.advance_percentage',
                'payment.advance_round_to',
                'payment.advance_floor',
            ])
            ->get()
            ->keyBy('key');

        $mode = (string) ($rows['payment.advance_mode']->value ?? self::MODE_NONE);
        if (! in_array($mode, [self::MODE_NONE, self::MODE_DELIVERY_CHARGE, self::MODE_PERCENTAGE, self::MODE_FULL], true)) {
            $mode = self::MODE_NONE;
        }

        $percentage = (int) ($rows['payment.advance_percentage']->value ?? 30);
        $percentage = max(1, min(99, $percentage));

        $roundTo = (int) ($rows['payment.advance_round_to']->value ?? 1);
        if (! in_array($roundTo, [1, 10, 50], true)) {
            $roundTo = 1;
        }

        $floor = (int) ($rows['payment.advance_floor']->value ?? 50);
        if ($floor < 0) {
            $floor = 0;
        }

        return [
            'mode' => $mode,
            'percentage' => $percentage,
            'round_to' => $roundTo,
            'floor' => $floor,
        ];
    }

    protected function roundTo(float $value, int $unit): float
    {
        if ($unit <= 1) {
            return round($value);
        }
        return floor($value / $unit) * $unit;
    }
}
