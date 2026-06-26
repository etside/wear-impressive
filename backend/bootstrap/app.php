<?php

use App\Http\Middleware\AttachCurrentStore;
use App\Http\Middleware\AuthenticateVendorOrStaff;
use App\Http\Middleware\EnsureStoreContext;
use App\Http\Middleware\ResolveStoreMiddleware;
use App\Http\Middleware\VerifyCourierWebhook;
use App\Http\Middleware\VerifyPaymentWebhook;
use App\Http\Responses\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'resolve.store' => ResolveStoreMiddleware::class,
            'store.context' => EnsureStoreContext::class,
            'attach.store' => AttachCurrentStore::class,
            'auth.vendor_or_staff' => AuthenticateVendorOrStaff::class,
            'verify.payment_webhook' => VerifyPaymentWebhook::class,
            'verify.courier_webhook' => VerifyCourierWebhook::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->expectsJson() && ! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return ApiResponse::error('Validation failed.', 422, $e->errors());
            }
            if ($e instanceof AuthenticationException) {
                return ApiResponse::error('Unauthenticated.', 401);
            }
            if ($e instanceof AuthorizationException) {
                return ApiResponse::error('Forbidden.', 403);
            }
            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return ApiResponse::error('Not found.', 404);
            }
            if ($e instanceof HttpExceptionInterface) {
                return ApiResponse::error($e->getMessage() ?: 'Request failed.', $e->getStatusCode());
            }

            if (config('app.debug')) {
                return ApiResponse::error($e->getMessage(), 500, [
                    'exception' => class_basename($e),
                    'file' => $e->getFile().':'.$e->getLine(),
                ]);
            }

            return ApiResponse::error('Server error.', 500);
        });
    })->create();
