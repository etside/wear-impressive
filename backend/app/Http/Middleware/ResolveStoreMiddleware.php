<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveStoreMiddleware
{
    /**
     * Single-tenant fallback handle. When no store can be resolved from the
     * request (no X-Store-Handle header, no matching subdomain, no custom
     * domain), this handle is used as the last resort. Mirrors the frontend's
     * TENANT_HANDLE constant in lib/api/storefront-context.ts.
     *
     * Set to null to disable the fallback (multi-tenant mode).
     */
    protected const FALLBACK_HANDLE = 'wi';

    /**
     * Base domain used to extract subdomains. Defaults to env('APP_DOMAIN').
     *
     * e.g. APP_DOMAIN=etommerce.com means "storename.etommerce.com" -> "storename"
     */
    protected function baseDomain(): string
    {
        return rtrim((string) config('app.domain', env('APP_DOMAIN', 'etommerce.com')), '.');
    }

    /**
     * Hosts that should be treated as having no store context (dev convenience).
     */
    protected function isBareHost(string $host): bool
    {
        $host = strtolower($host);

        // Strip port
        if (str_contains($host, ':')) {
            $host = explode(':', $host, 2)[0];
        }

        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return true;
        }

        // Match "etommerce.com" itself (no subdomain part).
        $base = $this->baseDomain();
        if ($host === $base || $host === 'www.'.$base) {
            return true;
        }

        return false;
    }

    /**
     * Extract a subdomain from the given host, if any.
     * Returns null if the host has no resolvable subdomain slug.
     */
    protected function extractSubdomain(string $host): ?string
    {
        $host = strtolower($host);

        if (str_contains($host, ':')) {
            $host = explode(':', $host, 2)[0];
        }

        $base = $this->baseDomain();

        // Handle "<slug>.localhost" for dev.
        if (str_ends_with($host, '.localhost')) {
            $slug = substr($host, 0, -strlen('.localhost'));

            return $slug !== '' ? $slug : null;
        }

        // Handle "<slug>.<base-domain>"
        if ($base !== '' && str_ends_with($host, '.'.$base)) {
            $slug = substr($host, 0, -strlen('.'.$base));

            // Reject "www" as a store slug.
            if ($slug === '' || strtolower($slug) === 'www') {
                return null;
            }

            return $slug;
        }

        return null;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = (string) $request->getHost();

        $store = null;

        // Dev convenience: accept X-Store-Handle header as an explicit override.
        $headerHandle = trim((string) $request->header('X-Store-Handle', ''));
        if ($headerHandle !== '') {
            $store = Store::query()->where('handle', $headerHandle)->first();
        }

        if (! $store) {
            $slug = null;

            // Only attempt subdomain/domain resolution on non-bare hosts.
            if (! $this->isBareHost($host)) {
                $slug = $this->extractSubdomain($host);

                if ($slug !== null) {
                    $store = Store::query()->where('handle', $slug)->first();
                }

                // Fall back to custom_domain match (must be the full host).
                if (! $store) {
                    $hostOnly = $host;
                    if (str_contains($hostOnly, ':')) {
                        $hostOnly = explode(':', $hostOnly, 2)[0];
                    }
                    $store = Store::query()->where('custom_domain', $hostOnly)->first();
                }
            }
        }

        // Single-tenant fallback: if no store resolved from header/subdomain/domain,
        // try the hardcoded tenant handle before giving up.
        if (! $store && static::FALLBACK_HANDLE !== null) {
            $store = Store::query()->where('handle', static::FALLBACK_HANDLE)->first();
        }

        if (! $store) {
            return ApiResponse::error('Store not found.', 404);
        }

        if ($store->status !== 'active') {
            return ApiResponse::error('Store is not active.', 404);
        }

        // Share the store with the request and app container.
        $request->store = $store;
        $request->attributes->set('store', $store);
        app()->instance('current_store', $store);

        return $next($request);
    }
}
