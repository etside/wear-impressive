<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Resolve the "current store" from the request or the app container.
     */
    protected function currentStore(?Request $request = null): ?Store
    {
        $request = $request ?: request();

        if ($request && isset($request->store) && $request->store instanceof Store) {
            return $request->store;
        }

        if (app()->bound('current_store')) {
            $store = app('current_store');
            if ($store instanceof Store) {
                return $store;
            }
        }

        return null;
    }

    /**
     * Resolve the current store id or null.
     */
    protected function currentStoreId(?Request $request = null): ?int
    {
        $store = $this->currentStore($request);

        return $store?->id;
    }

    /**
     * Return the currently authenticated user across any of our guards.
     */
    protected function currentUser(): mixed
    {
        foreach (['vendor', 'staff', 'customer'] as $guard) {
            if (auth($guard)->check()) {
                return auth($guard)->user();
            }
        }

        return null;
    }

    /**
     * Return the current user type (vendor|staff|customer) or null.
     */
    protected function currentUserType(): ?string
    {
        foreach (['vendor', 'staff', 'customer'] as $guard) {
            if (auth($guard)->check()) {
                return $guard;
            }
        }

        return null;
    }
}
