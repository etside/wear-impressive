<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerSegment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * SegmentCalculator evaluates a CustomerSegment's conditions against the
 * customers table and rebuilds its segment_memberships rows.
 *
 * Condition structure:
 * {
 *   "match": "all"|"any",
 *   "rules": [
 *     {"field": "total_spent", "operator": ">", "value": 5000}
 *   ]
 * }
 *
 * Supported fields: total_spent, total_orders, loyalty_points,
 * last_order_at, created_at, tags, email, phone, name.
 *
 * Supported operators: =, !=, >, <, >=, <=, in, not_in, contains,
 * is_null, is_not_null.
 */
class SegmentCalculator
{
    protected const ALLOWED_FIELDS = [
        'total_spent',
        'total_orders',
        'loyalty_points',
        'last_order_at',
        'created_at',
        'tags',
        'email',
        'phone',
        'name',
    ];

    protected const COMPARE_OPERATORS = ['=', '!=', '>', '<', '>=', '<='];

    /**
     * Run segment conditions, rebuild memberships, update counters and timestamps.
     *
     * Returns the new customer_count.
     */
    public function calculate(CustomerSegment $segment): int
    {
        $matchedIds = $this->matchingCustomerIds($segment);

        DB::transaction(function () use ($segment, $matchedIds) {
            // Clear old memberships for this segment.
            DB::table('customer_segment_memberships')
                ->where('segment_id', $segment->id)
                ->delete();

            $now = Carbon::now();

            // Bulk insert in chunks.
            foreach (array_chunk($matchedIds, 500) as $chunk) {
                $rows = array_map(fn ($id) => [
                    'segment_id' => $segment->id,
                    'customer_id' => $id,
                    'added_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk);

                if (! empty($rows)) {
                    DB::table('customer_segment_memberships')->insert($rows);
                }
            }

            $segment->forceFill([
                'customer_count' => count($matchedIds),
                'last_calculated_at' => $now,
            ])->save();
        });

        return count($matchedIds);
    }

    /**
     * Return the list of customer IDs matched by this segment's conditions.
     *
     * @return array<int>
     */
    public function matchingCustomerIds(CustomerSegment $segment): array
    {
        return $this->queryForSegment($segment)->pluck('id')->all();
    }

    /**
     * Build an Eloquent query for customers matching this segment.
     */
    public function queryForSegment(CustomerSegment $segment): Builder
    {
        $query = Customer::query()->where('store_id', $segment->store_id);

        // Normalise both legacy and modern condition shapes to a single
        // internal form: { match: "all"|"any", rules: [{field, operator, value}] }.
        //
        // Modern (segment builder modal):
        //   {"match": "all", "rules": [{"field": "total_spent", "operator": ">=", "value": 5000}]}
        //
        // Legacy (seeded system segments):
        //   [{"field": "total_spent", "op": "gte", "value": 5000}]
        //
        // We coerce the legacy shape so older system segments (VIP / New /
        // Repeat) recalculate correctly without re-seeding.
        [$rules, $match] = $this->normaliseConditions($segment);

        if (empty($rules)) {
            return $query;
        }

        if ($match === 'any') {
            $query->where(function (Builder $outer) use ($rules) {
                foreach ($rules as $rule) {
                    $outer->orWhere(function (Builder $inner) use ($rule) {
                        $this->applyRule($inner, $rule);
                    });
                }
            });
        } else {
            foreach ($rules as $rule) {
                $query->where(function (Builder $inner) use ($rule) {
                    $this->applyRule($inner, $rule);
                });
            }
        }

        return $query;
    }

    /**
     * Read the segment's `conditions` JSON in either the modern or legacy
     * shape and return [normalised_rules, match_mode].
     *
     * @return array{0: array<int, array<string,mixed>>, 1: string}
     */
    protected function normaliseConditions(CustomerSegment $segment): array
    {
        $conditions = $segment->conditions ?? [];
        $defaultMatch = strtolower($segment->condition_match ?? 'all');

        // Modern shape: object with `rules` key.
        if (is_array($conditions) && isset($conditions['rules']) && is_array($conditions['rules'])) {
            $rules = $conditions['rules'];
            $match = strtolower($conditions['match'] ?? $defaultMatch);
            return [$this->normaliseRules($rules), $match === 'any' ? 'any' : 'all'];
        }

        // Legacy shape: a flat array of {field, op, value} entries. Implicit
        // "all" mode since legacy seeders never specified one.
        if (is_array($conditions) && array_is_list($conditions)) {
            return [$this->normaliseRules($conditions), $defaultMatch === 'any' ? 'any' : 'all'];
        }

        return [[], $defaultMatch === 'any' ? 'any' : 'all'];
    }

    /**
     * Coerce each rule into the form `applyRule()` expects:
     *   { field: string, operator: string, value: mixed }.
     *
     * - Accepts both `operator` (modern) and `op` (legacy) keys.
     * - Translates legacy short-codes (`gte`, `lte`, `gt`, `lt`, `eq`, `neq`)
     *   into SQL-style symbols (`>=`, `<=`, `>`, `<`, `=`, `!=`).
     */
    protected function normaliseRules(array $rules): array
    {
        $opAliases = [
            'gte' => '>=', 'lte' => '<=',
            'gt'  => '>',  'lt'  => '<',
            'eq'  => '=',  'neq' => '!=',
            'ne'  => '!=', 'equals' => '=',
        ];

        $out = [];
        foreach ($rules as $rule) {
            if (! is_array($rule)) continue;
            $field = $rule['field'] ?? null;
            if (! $field) continue;

            $op = strtolower((string) ($rule['operator'] ?? $rule['op'] ?? '='));
            $op = $opAliases[$op] ?? $op;

            $out[] = [
                'field' => $field,
                'operator' => $op,
                'value' => $rule['value'] ?? null,
            ];
        }
        return $out;
    }

    /**
     * Apply a single rule onto the given query builder.
     *
     * @param  array<string,mixed>  $rule
     */
    protected function applyRule(Builder $query, array $rule): void
    {
        $field = $rule['field'] ?? null;
        $operator = strtolower((string) ($rule['operator'] ?? '='));
        $value = $rule['value'] ?? null;

        // "ordered_attribute" matches customers who have placed an order
        // containing a product/variant satisfying the selected filters
        // (category, product, variant option label/value). Any omitted filter
        // means "any". The rule's operator toggles match-any vs no-match.
        if ($field === 'ordered_attribute') {
            $this->applyOrderedAttributeRule($query, $operator, is_array($value) ? $value : []);

            return;
        }

        if (! in_array($field, self::ALLOWED_FIELDS, true)) {
            return;
        }

        // Tags is stored as JSON array — use JSON contains semantics.
        if ($field === 'tags') {
            $this->applyTagRule($query, $operator, $value);

            return;
        }

        if (in_array($operator, self::COMPARE_OPERATORS, true)) {
            $query->where($field, $operator, $value);

            return;
        }

        if ($operator === 'in' && is_array($value)) {
            $query->whereIn($field, $value);

            return;
        }

        if ($operator === 'not_in' && is_array($value)) {
            $query->whereNotIn($field, $value);

            return;
        }

        if ($operator === 'contains' && is_string($value)) {
            $query->where($field, 'like', '%'.$value.'%');

            return;
        }

        if ($operator === 'is_null') {
            $query->whereNull($field);

            return;
        }

        if ($operator === 'is_not_null') {
            $query->whereNotNull($field);
        }
    }

    /**
     * Tag filtering uses JSON contains semantics.
     */
    protected function applyTagRule(Builder $query, string $operator, mixed $value): void
    {
        if ($operator === 'contains' || $operator === '=') {
            $query->whereJsonContains('tags', $value);

            return;
        }

        if ($operator === '!=' || $operator === 'not_in') {
            $values = is_array($value) ? $value : [$value];
            foreach ($values as $v) {
                $query->whereJsonDoesntContain('tags', $v);
            }

            return;
        }

        if ($operator === 'in' && is_array($value)) {
            $query->where(function (Builder $inner) use ($value) {
                foreach ($value as $v) {
                    $inner->orWhereJsonContains('tags', $v);
                }
            });
        }
    }

    /**
     * Filter customers by their order history. A customer matches when they
     * have at least one order whose items match the given filters.
     *
     * Value shape:
     *   category_id?: int
     *   product_id?: int
     *   option_label?: string  (e.g. "Size")
     *   option_value?: string  (e.g. "L")
     *
     * Operator: "has" (default) keeps matching customers, "not_has" inverts.
     */
    protected function applyOrderedAttributeRule(Builder $query, string $operator, array $value): void
    {
        $categoryId  = isset($value['category_id'])  && $value['category_id']  !== '' ? (int) $value['category_id']  : null;
        $productId   = isset($value['product_id'])   && $value['product_id']   !== '' ? (int) $value['product_id']   : null;
        $optionLabel = isset($value['option_label']) && $value['option_label'] !== '' ? (string) $value['option_label'] : null;
        $optionValue = isset($value['option_value']) && $value['option_value'] !== '' ? (string) $value['option_value'] : null;

        // whereExists() invokes the callback with a Query\Builder (not
        // Eloquent\Builder), so we type-hint as a generic $sub.
        $builder = function ($sub) use ($categoryId, $productId, $optionLabel, $optionValue) {
            $sub->from('orders')
                ->whereColumn('orders.customer_id', 'customers.id')
                ->whereIn('orders.status', ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered']);

            $hasItemFilter = $categoryId || $productId || $optionLabel || $optionValue;
            if (! $hasItemFilter) return;

            $sub->whereExists(function ($items) use ($categoryId, $productId, $optionLabel, $optionValue) {
                $items->from('order_items')
                    ->whereColumn('order_items.order_id', 'orders.id');

                if ($productId) {
                    $items->where('order_items.product_id', $productId);
                }

                if ($categoryId) {
                    $items->whereExists(function ($p) use ($categoryId) {
                        $p->from('products')
                            ->whereColumn('products.id', 'order_items.product_id')
                            ->where('products.category_id', $categoryId);
                    });
                }

                if ($optionLabel || $optionValue) {
                    $items->whereExists(function ($v) use ($optionLabel, $optionValue) {
                        $v->from('product_variants')
                            ->whereColumn('product_variants.id', 'order_items.variant_id');

                        if ($optionLabel && $optionValue) {
                            // JSON exact-match on the option label/value pair.
                            // SQLite stores JSON as text — use json_extract.
                            $v->whereRaw(
                                "json_extract(product_variants.options, '$.\"{$optionLabel}\"') = ?",
                                [$optionValue]
                            );
                        } elseif ($optionValue) {
                            // Value specified but not label: match any key.
                            $v->where(function ($q) use ($optionValue) {
                                $q->whereRaw('product_variants.options LIKE ?', ['%"'.$optionValue.'"%']);
                            });
                        } elseif ($optionLabel) {
                            // Label specified but not value: just require the key present.
                            $v->whereRaw(
                                "json_extract(product_variants.options, '$.\"{$optionLabel}\"') IS NOT NULL"
                            );
                        }
                    });
                }
            });
        };

        if ($operator === 'not_has') {
            $query->whereNotExists($builder);
        } else {
            $query->whereExists($builder);
        }
    }
}
