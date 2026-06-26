<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreContext
{
    /**
     * Handle an incoming request. Requires that ResolveStoreMiddleware
     * has already populated $request->store / app('current_store').
     */
    public function handle(Request $request, Closure $next): Response
    {
        $store = null;

        if (isset($request->store) && $request->store instanceof Store) {
            $store = $request->store;
        } elseif (app()->bound('current_store')) {
            $candidate = app('current_store');
            if ($candidate instanceof Store) {
                $store = $candidate;
            }
        }

        if (! $store) {
            return ApiResponse::error('Store context is required for this endpoint.', 400);
        }

        return $next($request);
    }
}
