<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerSegment extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'conditions' => 'array',
        'is_system' => 'boolean',
        'last_calculated_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customers(): BelongsToMany
    {
        return $this->belongsToMany(
            Customer::class,
            'customer_segment_memberships',
            'segment_id',
            'customer_id'
        )->withTimestamps()->withPivot('added_at');
    }
}
