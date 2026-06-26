<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'onboarding_completed' => 'boolean',
        'trial_ends_at' => 'datetime',
    ];

    // Relationships

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(ProductCategory::class);
    }

    public function brands(): HasMany
    {
        return $this->hasMany(Brand::class);
    }

    // Accessors

    protected function isOnTrial(): Attribute
    {
        return Attribute::get(fn () => $this->trial_ends_at && $this->trial_ends_at->isFuture());
    }

    protected function planLabel(): Attribute
    {
        return Attribute::get(fn () => match ($this->plan) {
            'free' => 'Free',
            'basic' => 'Basic',
            'pro' => 'Pro',
            default => ucfirst((string) $this->plan),
        });
    }
}
