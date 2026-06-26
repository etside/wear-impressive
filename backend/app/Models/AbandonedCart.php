<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbandonedCart extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'items' => 'array',
        'total' => 'decimal:2',
        'recovered_at' => 'datetime',
        'recovery_email_sent_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function recoveryOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'recovery_order_id');
    }
}
