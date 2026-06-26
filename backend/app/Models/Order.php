<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'advance_amount' => 'decimal:2',
        'cod_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'shipping_address' => 'array',
        'billing_address' => 'array',
        'metadata' => 'array',
        'payment_response' => 'array',
        'cancelled_at' => 'datetime',
    ];

    protected $appends = ['amount_outstanding', 'is_advance_settled', 'is_fully_paid'];

    // Relationships

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerAddress(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function fulfillments(): HasMany
    {
        return $this->hasMany(OrderFulfillment::class);
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(OrderTimeline::class);
    }

    public function returnRequests(): HasMany
    {
        return $this->hasMany(ReturnRequest::class);
    }

    // Accessors

    protected function isGuest(): Attribute
    {
        return Attribute::get(fn () => $this->customer_id === null);
    }

    /**
     * How much money is still owed on the order. `total - amount_paid`,
     * floored at 0 in case rounding pushes it negative.
     */
    protected function amountOutstanding(): Attribute
    {
        return Attribute::get(fn () => max(0, (float) $this->total - (float) ($this->amount_paid ?? 0)));
    }

    /**
     * True when the customer has settled at least the prepaid portion
     * (used to gate "ready to ship" — vendors don't pack until the
     * advance is in). Falls back to `payment_status === 'paid'` for
     * legacy orders without an advance split.
     */
    protected function isAdvanceSettled(): Attribute
    {
        return Attribute::get(function () {
            $advance = (float) ($this->advance_amount ?? 0);
            $paid = (float) ($this->amount_paid ?? 0);
            if ($advance > 0) {
                return $paid + 0.01 >= $advance; // 1-paisa tolerance
            }
            // advance_amount = 0 means either COD (nothing pre-paid) or fully
            // paid online. Only treat it as "settled" if payment is confirmed.
            return $this->payment_status === 'paid';
        });
    }

    /**
     * True when amount_paid covers the full total (within rounding).
     */
    protected function isFullyPaid(): Attribute
    {
        return Attribute::get(fn () => (float) ($this->amount_paid ?? 0) + 0.01 >= (float) $this->total);
    }
}
