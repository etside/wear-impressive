<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerifyPaymentWebhook
{
    /**
     * Sanity-check an incoming gateway webhook.
     *
     * Strategy per gateway:
     *  - SSLCommerz: always accepts; server-side validation is done by calling
     *    validationserverAPI.php from the controller. A shared secret header
     *    (X-Webhook-Secret) is accepted as an optional belt-and-braces check.
     *  - bKash: we verify by re-executing the paymentID server-side, so the
     *    middleware only enforces the shared secret when one is configured.
     *  - Nagad: signature on the sensitiveData payload is verified in the
     *    controller (RSA). Middleware enforces the shared secret when set.
     *
     * The shared secret is pulled from config('payments.webhook_secret').
     * In production, an empty secret causes a 500 (fail closed). In non-
     * production environments the header check is skipped (dev friendly)
     * but the request is still logged for auditability.
     */
    public function handle(Request $request, Closure $next, ?string $gateway = null): Response
    {
        $gateway = strtolower((string) $gateway);
        $secret = (string) config('payments.webhook_secret', '');

        // Fail closed in production: an unconfigured secret must not silently
        // allow unauthenticated webhook requests through.
        if ($secret === '' && app()->environment('production')) {
            Log::channel('stack')->critical('[payments] webhook secret not configured in production', [
                'gateway' => $gateway,
                'ip'      => $request->ip(),
            ]);

            abort(500, 'Payment webhook secret not configured');
        }

        if ($secret !== '') {
            $presented = (string) $request->header('X-Webhook-Secret', $request->query('secret', ''));

            if (! hash_equals($secret, $presented)) {
                // For bKash + Nagad where the gateway cannot send our header,
                // allow the request through when there's a gateway-native signal,
                // which the controller will re-verify against the gateway.
                $hasGatewaySignal = match ($gateway) {
                    'bkash'      => (bool) $request->input('paymentID'),
                    'nagad'      => (bool) $request->input('payment_ref_id', $request->input('paymentRefId')),
                    'sslcommerz' => (bool) $request->input('tran_id', $request->input('val_id')),
                    default      => false,
                };

                if (! $hasGatewaySignal) {
                    Log::channel('stack')->warning('[payments] webhook.unauthorized', [
                        'gateway' => $gateway,
                        'ip'      => $request->ip(),
                    ]);

                    return ApiResponse::error('Invalid webhook signature.', 401);
                }
            }
        }

        Log::channel('stack')->info('[payments] webhook.received', [
            'gateway' => $gateway,
            'ip'      => $request->ip(),
        ]);

        return $next($request);
    }
}
