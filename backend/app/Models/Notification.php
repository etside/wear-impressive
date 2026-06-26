<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    // notifiable_type stores short keys ("vendor" | "staff"). Expose a
    // lightweight accessor instead of a morphTo relationship.
    protected function notifiable(): Attribute
    {
        return Attribute::get(function () {
            return match ($this->notifiable_type) {
                'vendor' => Vendor::find($this->notifiable_id),
                'staff' => Staff::find($this->notifiable_id),
                default => null,
            };
        });
    }
}
