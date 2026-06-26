<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Mail\PasswordResetMail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * Send the password reset email using the per-store template.
     */
    public function sendPasswordResetNotification($token): void
    {
        if (! $this->email) {
            return;
        }

        Mail::to($this->email)->queue(new PasswordResetMail($this, $token));
    }

    protected $fillable = [
        'store_id',
        'email',
        'phone',
        'password',
        'name',
        'avatar',
        'date_of_birth',
        'gender',
        'total_spent',
        'total_orders',
        'loyalty_points',
        'email_verified_at',
        'phone_verified_at',
        'notes',
        'tags',
        'metadata',
        'last_order_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'tags' => 'array',
        'metadata' => 'array',
        'password' => 'hashed',
        'date_of_birth' => 'date',
        'total_spent' => 'decimal:2',
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'last_order_at' => 'datetime',
    ];

    // Relationships

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function segments(): BelongsToMany
    {
        return $this->belongsToMany(
            CustomerSegment::class,
            'customer_segment_memberships',
            'customer_id',
            'segment_id'
        )->withTimestamps()->withPivot('added_at');
    }
}
