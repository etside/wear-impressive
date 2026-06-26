<?php

/*
|--------------------------------------------------------------------------
| Bangladesh Payment Gateways
|--------------------------------------------------------------------------
|
| Default credentials + endpoints for the three supported BD gateways.
| Per-store overrides are layered on top at runtime by
| App\Services\Payments\PaymentGatewayResolver.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Shared options
    |--------------------------------------------------------------------------
    */

    'currency' => env('PAYMENTS_CURRENCY', 'BDT'),

    // Shared secret header used by the VerifyPaymentWebhook middleware as a
    // fallback when a gateway does not offer per-request signatures.
    'webhook_secret' => env('PAYMENTS_WEBHOOK_SECRET'),

    // Browser-facing URLs the gateways will redirect the customer to.
    'return_urls' => [
        'success' => env('PAYMENTS_SUCCESS_URL', env('APP_URL').'/checkout/success'),
        'fail'    => env('PAYMENTS_FAIL_URL', env('APP_URL').'/checkout/fail'),
        'cancel'  => env('PAYMENTS_CANCEL_URL', env('APP_URL').'/checkout/cancel'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Gateways
    |--------------------------------------------------------------------------
    */

    'gateways' => [

        'sslcommerz' => [
            'store_id'       => env('SSLCOMMERZ_STORE_ID'),
            'store_password' => env('SSLCOMMERZ_STORE_PASSWORD'),
            'is_sandbox'     => (bool) env('SSLCOMMERZ_IS_SANDBOX', true),
            'url_base'       => env('SSLCOMMERZ_IS_SANDBOX', true)
                ? 'https://sandbox.sslcommerz.com'
                : 'https://securepay.sslcommerz.com',
            'endpoints' => [
                'session'  => '/gwprocess/v4/api.php',
                'validate' => '/validator/api/validationserverAPI.php',
                'refund'   => '/validator/api/merchantTransIDvalidationAPI.php',
            ],
            'ipn_url'     => env('SSLCOMMERZ_IPN_URL', env('APP_URL').'/api/webhooks/payments/sslcommerz'),
            'success_url' => env('SSLCOMMERZ_SUCCESS_URL', env('APP_URL').'/api/webhooks/payments/sslcommerz?status=success'),
            'fail_url'    => env('SSLCOMMERZ_FAIL_URL', env('APP_URL').'/api/webhooks/payments/sslcommerz?status=fail'),
            'cancel_url'  => env('SSLCOMMERZ_CANCEL_URL', env('APP_URL').'/api/webhooks/payments/sslcommerz?status=cancel'),
        ],

        'bkash' => [
            'app_key'    => env('BKASH_APP_KEY'),
            'app_secret' => env('BKASH_APP_SECRET'),
            'username'   => env('BKASH_USERNAME'),
            'password'   => env('BKASH_PASSWORD'),
            'is_sandbox' => (bool) env('BKASH_IS_SANDBOX', true),
            'url_base'   => env('BKASH_IS_SANDBOX', true)
                ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
                : 'https://tokenized.pay.bka.sh/v1.2.0-beta',
            'endpoints' => [
                'grant_token' => '/tokenized/checkout/token/grant',
                'refresh'     => '/tokenized/checkout/token/refresh',
                'create'      => '/tokenized/checkout/create',
                'execute'     => '/tokenized/checkout/execute',
                'query'       => '/tokenized/checkout/payment/status',
                'refund'      => '/tokenized/checkout/payment/refund',
            ],
            'callback_url' => env('BKASH_CALLBACK_URL', env('APP_URL').'/api/webhooks/payments/bkash'),
        ],

        'nagad' => [
            'merchant_id'     => env('NAGAD_MERCHANT_ID'),
            'merchant_number' => env('NAGAD_MERCHANT_NUMBER'),
            'public_key'      => env('NAGAD_PUBLIC_KEY'),
            'private_key'     => env('NAGAD_PRIVATE_KEY'),
            'is_sandbox'      => (bool) env('NAGAD_IS_SANDBOX', true),
            'url_base'        => env('NAGAD_IS_SANDBOX', true)
                ? 'https://sandbox-ssl.mynagad.com:10443'
                : 'https://api.mynagad.com',
            'endpoints' => [
                'initialize' => '/remote-payment-gateway-1.0/api/dfs/check-out/initialize/{merchantId}/{orderId}',
                'complete'   => '/remote-payment-gateway-1.0/api/dfs/check-out/complete/{paymentRefId}',
                'verify'     => '/remote-payment-gateway-1.0/api/dfs/verify/payment/{paymentRefId}',
            ],
            'callback_url' => env('NAGAD_CALLBACK_URL', env('APP_URL').'/api/webhooks/payments/nagad'),
        ],
    ],
];
