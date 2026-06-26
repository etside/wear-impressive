<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Staff extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $table = 'staff';

    protected $fillable = [
        'store_id',
        'email',
        'phone',
        'password',
        'name',
        'avatar',
        'role',
        'permissions',
        'branch_ids',
        'invited_by',
        'invitation_token',
        'accepted_at',
        'last_login_at',
        'active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'invitation_token',
    ];

    protected $casts = [
        'permissions' => 'array',
        'branch_ids' => 'array',
        'active' => 'boolean',
        'password' => 'hashed',
        'accepted_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    // Relationships

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'invited_by');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'causer_id')
            ->where('causer_type', self::class);
    }
}
