<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CartItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'price_snapshot' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * For bundle line items: the parent row carries the bundle product +
     * the bundle price snapshot. Each component gets its own child row
     * with parent_cart_item_id set so we know what variants the customer
     * picked. Children carry price_snapshot=0 — totals are owned by the
     * parent only, no double-counting.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_cart_item_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_cart_item_id');
    }

    public function isBundleParent(): bool
    {
        return $this->parent_cart_item_id === null && $this->relationLoaded('product')
            ? (bool) $this->product?->isBundle()
            : false;
    }
}
