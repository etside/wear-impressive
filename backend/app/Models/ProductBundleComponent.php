<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per (bundle, component product) pairing. The bundle is the
 * outer product (product_type='bundle'); the component is a regular
 * product whose variants the customer picks at purchase time.
 */
class ProductBundleComponent extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'quantity' => 'integer',
        'sort_order' => 'integer',
        'is_required' => 'boolean',
    ];

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'bundle_product_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }
}
