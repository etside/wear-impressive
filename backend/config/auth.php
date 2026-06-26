<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option defines the default authentication "guard" and password
    | reset "broker" for your application. You may change these values
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'vendor'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'vendors'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | eTommerce has three distinct authenticated user types:
    |
    |   - vendor   : store owner / admin (dashboard)
    |   - staff    : team members (managers, cashiers, inventory)
    |   - customer : storefront shoppers
    |
    | All guards use the session driver by default. API token auth for each
    | model is powered by Laravel Sanctum's HasApiTokens trait.
    |
    | Supported: "session"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'vendors',
        ],

        'vendor' => [
            'driver' => 'sanctum',
            'provider' => 'vendors',
        ],

        'staff' => [
            'driver' => 'sanctum',
            'provider' => 'staff',
        ],

        'customer' => [
            'driver' => 'sanctum',
            'provider' => 'customers',
        ],

        'super_admin' => [
            'driver' => 'sanctum',
            'provider' => 'super_admins',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'vendors' => [
            'driver' => 'eloquent',
            'model' => App\Models\Vendor::class,
        ],

        'staff' => [
            'driver' => 'eloquent',
            'model' => App\Models\Staff::class,
        ],

        'customers' => [
            'driver' => 'eloquent',
            'model' => App\Models\Customer::class,
        ],

        'super_admins' => [
            'driver' => 'eloquent',
            'model' => App\Models\SuperAdmin::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | Each authenticated type has its own broker with a dedicated token table
    | so that reset tokens from one audience cannot be used against another.
    |
    */

    'passwords' => [
        'vendors' => [
            'provider' => 'vendors',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],

        'staff' => [
            'provider' => 'staff',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],

        'customers' => [
            'provider' => 'customers',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],

        'super_admins' => [
            'provider' => 'super_admins',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the amount of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
