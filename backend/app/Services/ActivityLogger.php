<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    protected ?int $storeId = null;

    protected ?string $logName = null;

    protected ?Model $subject = null;

    protected ?Model $causer = null;

    protected array $properties = [];

    protected ?string $event = null;

    public function inStore(?int $storeId): self
    {
        $this->storeId = $storeId;

        return $this;
    }

    public function useLog(string $name): self
    {
        $this->logName = $name;

        return $this;
    }

    public function performedOn(?Model $subject): self
    {
        $this->subject = $subject;

        return $this;
    }

    public function causedBy(?Model $causer): self
    {
        $this->causer = $causer;

        return $this;
    }

    public function withProperties(array $properties): self
    {
        $this->properties = array_merge($this->properties, $properties);

        return $this;
    }

    public function event(?string $event): self
    {
        $this->event = $event;

        return $this;
    }

    public function log(string $description): ActivityLog
    {
        $request = request();
        $causer = $this->causer ?? $this->resolveAuthCauser();
        $storeId = $this->storeId ?? $this->resolveStoreId($request);

        return ActivityLog::create([
            'store_id' => $storeId,
            'log_name' => $this->logName ?? 'default',
            'description' => $description,
            'subject_type' => $this->subject?->getMorphClass(),
            'subject_id' => $this->subject?->getKey(),
            'causer_type' => $causer?->getMorphClass(),
            'causer_id' => $causer?->getKey(),
            'properties' => $this->properties ?: null,
            'event' => $this->event,
            'ip_address' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 255) ?: null,
        ]);
    }

    protected function resolveAuthCauser(): ?Model
    {
        foreach (['vendor', 'staff', 'customer', 'web'] as $guard) {
            $user = Auth::guard($guard)->user();
            if ($user instanceof Model) {
                return $user;
            }
        }

        return null;
    }

    protected function resolveStoreId(?Request $request): ?int
    {
        if (! $request) {
            return null;
        }
        $store = $request->attributes->get('store') ?? ($request->store ?? null);

        return $store?->id;
    }
}
