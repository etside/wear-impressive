<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateVendorOrStaff
{
    /**
     * Authenticate the request against either the vendor or staff guard.
     *
     * This is intended for endpoints (e.g. POS) that may be used by either
     * the store owner (vendor) or a cashier (staff).
     */
    public function handle(Request $request, Closure $next): Response
    {
        foreach (['vendor', 'staff'] as $guard) {
            if (auth($guard)->check()) {
                auth()->shouldUse($guard);

                return $next($request);
            }
        }

        return ApiResponse::error('Unauthenticated.', 401);
    }
}
