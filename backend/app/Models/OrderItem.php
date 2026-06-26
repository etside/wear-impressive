<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'cost_price_snapshot' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
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
     * Bundle support — same parent/children pattern as CartItem. The
     * parent row carries the bundle price; each child carries the
     * component product/variant identity for fulfillment + analytics.
     * Children's price/subtotal/total are 0 to avoid double-counting.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_order_item_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_order_item_id');
    }
}
