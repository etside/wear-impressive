<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaPixelSetting extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'track_view_content' => 'boolean',
        'track_add_to_cart' => 'boolean',
        'track_initiate_checkout' => 'boolean',
        'track_purchase' => 'boolean',
        'use_conversions_api' => 'boolean',
    ];

    // Never expose access_token in API responses.
    protected $hidden = ['access_token'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
