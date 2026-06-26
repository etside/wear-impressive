<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyConfig extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'spend_amount_for_points' => 'decimal:2',
        'points_per_spend' => 'integer',
        'redemption_value' => 'decimal:2',
        'min_redemption_points' => 'integer',
        'points_expiry_days' => 'integer',
        'welcome_bonus_points' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
