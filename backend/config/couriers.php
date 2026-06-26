<?php

/*
|--------------------------------------------------------------------------
| Courier Gateway Configuration
|--------------------------------------------------------------------------
|
| Per-courier sandbox/live base URLs and default credentials read from env.
| Per-store overrides live in the `delivery_partners` table and are merged
| over these defaults by `CourierGatewayResolver`.
|
*/

return [

    'default_timeout' => (int) env('COURIER_HTTP_TIMEOUT', 30),

    'pathao' => [
        'sandbox_base_url' => env('PATHAO_SANDBOX_BASE_URL', 'https://courier-api-sandbox.pathao.com'),
        'live_base_url'    => env('PATHAO_LIVE_BASE_URL', 'https://api-hermes.pathao.com'),
        'client_id'        => env('PATHAO_CLIENT_ID'),
        'client_secret'    => env('PATHAO_CLIENT_SECRET'),
        'username'         => env('PATHAO_USERNAME'),
        'password'         => env('PATHAO_PASSWORD'),
        'secret_token'     => env('PATHAO_SECRET_TOKEN'),
        'store_id'         => env('PATHAO_STORE_ID'),
        'webhook_secret'   => env('PATHAO_WEBHOOK_SECRET'),
    ],

    'steadfast' => [
        'sandbox_base_url' => env('STEADFAST_SANDBOX_BASE_URL', 'https://portal.packzy.com/api/v1'),
        'live_base_url'    => env('STEADFAST_LIVE_BASE_URL', 'https://portal.steadfast.com.bd/api/v1'),
        'api_key'          => env('STEADFAST_API_KEY'),
        'secret_key'       => env('STEADFAST_SECRET_KEY'),
        'webhook_secret'   => env('STEADFAST_WEBHOOK_SECRET'),
    ],

    'redx' => [
        'sandbox_base_url' => env('REDX_SANDBOX_BASE_URL', 'https://sandbox.redx.com.bd/v1.0.0-beta'),
        'live_base_url'    => env('REDX_LIVE_BASE_URL', 'https://openapi.redx.com.bd/v1.0.0-beta'),
        'api_token'        => env('REDX_API_TOKEN'),
        'webhook_secret'   => env('REDX_WEBHOOK_SECRET'),
    ],

    'sundarban' => [
        'live_base_url'    => env('SUNDARBAN_BASE_URL'),
        'api_key'          => env('SUNDARBAN_API_KEY'),
    ],

    'paperfly' => [
        'live_base_url'    => env('PAPERFLY_BASE_URL'),
        'api_key'          => env('PAPERFLY_API_KEY'),
    ],

];
