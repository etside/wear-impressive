<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use App\Models\DeliveryPartner;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Courier webhook signature verification.
 *
 * For now we accept either a `?token=` query parameter OR a
 * `X-Webhook-Token` header. The expected value lives in the courier's
 * config (`config/couriers.{provider}.webhook_secret`) or, per-store, in
 * the matching `DeliveryPartner::settings['webhook_secret']`. If no secret
 * is configured anywhere the check is skipped (dev friendly).
 */
class VerifyCourierWebhook
{
    public function handle(Request $request, Closure $next, string $provider): Response
    {
        $provider = strtolower($provider);
        $providedToken = $request->header('X-Webhook-Token')
            ?? $request->query('token')
            ?? $request->input('token');

        // Collect every configured secret that could match this provider.
        $expected = [];

        $envSecret = config('couriers.'.$provider.'.webhook_secret');
        if ($envSecret) {
            $expected[] = (string) $envSecret;
        }

        $partnerSecrets = DeliveryPartner::where('provider', $provider)
            ->whereNotNull('settings')
            ->pluck('settings')
            ->map(fn ($s) => is_array($s) ? ($s['webhook_secret'] ?? null) : null)
            ->filter()
            ->unique()
            ->values()
            ->all();

        foreach ($partnerSecrets as $s) {
            $expected[] = (string) $s;
        }

        // No secrets configured anywhere — allow (dev-friendly).
        if (empty($expected)) {
            return $next($request);
        }

        if (! $providedToken) {
            Log::warning('courier.webhook.missing_token', ['provider' => $provider]);

            return ApiResponse::error('Missing webhook token.', 401);
        }

        foreach ($expected as $candidate) {
            if (hash_equals($candidate, (string) $providedToken)) {
                return $next($request);
            }
        }

        Log::warning('courier.webhook.invalid_token', ['provider' => $provider]);

        return ApiResponse::error('Invalid webhook token.', 401);
    }
}
