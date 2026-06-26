<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use HasFactory, Searchable, SoftDeletes;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'name' => $this->name,
            'sku' => $this->sku,
            'description' => strip_tags((string) $this->description),
            'tags' => $this->tags,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'price' => (float) $this->price,
            'status' => $this->status,
            'published_at' => $this->published_at?->timestamp,
        ];
    }

    public function shouldBeSearchable(): bool
    {
        return $this->status === 'active';
    }


    protected $guarded = [];

    protected $casts = [
        'images' => 'array',
        'tags' => 'array',
        'custom_tabs' => 'array',
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight_value' => 'decimal:3',
        'tax_rate' => 'decimal:2',
        'has_variants' => 'boolean',
        'track_inventory' => 'boolean',
        'is_taxable' => 'boolean',
        'published_at' => 'datetime',
        'bundle_price' => 'decimal:2',
        'bundle_discount_percent' => 'decimal:2',
        'bundle_compare_at_price' => 'decimal:2',
    ];

    public function isBundle(): bool
    {
        return $this->product_type === 'bundle';
    }

    // Relationships

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'sub_category_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function productImages(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryLogs(): HasMany
    {
        return $this->hasMany(InventoryLog::class);
    }

    public function branchStocks(): HasMany
    {
        return $this->hasMany(BranchStock::class);
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'collection_product')
            ->withTimestamps()
            ->withPivot('position');
    }

    /**
     * Components attached to this bundle (only meaningful when product_type='bundle').
     * Order by sort_order so the storefront renders pickers in the vendor-chosen order.
     */
    public function bundleComponents(): HasMany
    {
        return $this->hasMany(ProductBundleComponent::class, 'bundle_product_id')
            ->orderBy('sort_order');
    }

    /**
     * Bundles that contain this product as a component. Useful when checking
     * "is this product safe to delete" or surfacing impacted bundles.
     */
    public function partOfBundles(): HasMany
    {
        return $this->hasMany(ProductBundleComponent::class, 'component_product_id');
    }
}
