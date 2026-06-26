<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AttachCurrentStore
{
    /**
     * Attach the authenticated vendor/staff user's store to the request and app container.
     * Must run after an auth:vendor or auth:staff middleware.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = null;

        foreach (['vendor', 'staff'] as $guard) {
            if (auth($guard)->check()) {
                $user = auth($guard)->user();
                break;
            }
        }

        if (! $user) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $store = method_exists($user, 'store') ? $user->store : null;

        if (! $store) {
            return ApiResponse::error('No store is associated with this account.', 400);
        }

        $request->store = $store;
        $request->attributes->set('store', $store);
        app()->instance('current_store', $store);

        return $next($request);
    }
}
