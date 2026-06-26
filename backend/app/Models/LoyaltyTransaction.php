<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'points' => 'integer',
        'reference_id' => 'integer',
        'created_by_id' => 'integer',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(LoyaltyAccount::class, 'loyalty_account_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function createdBy(): MorphTo
    {
        return $this->morphTo(null, 'created_by_type', 'created_by_id');
    }
}
