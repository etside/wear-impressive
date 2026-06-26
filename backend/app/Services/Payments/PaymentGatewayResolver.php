<?php

namespace App\Services\Payments;

use App\Exceptions\PaymentGatewayException;
use App\Models\PaymentMethod;
use App\Models\Store;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\BkashGateway;
use App\Services\Payments\Gateways\NagadGateway;
use App\Services\Payments\Gateways\SslCommerzGateway;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class PaymentGatewayResolver
{
    /**
     * Map method -> gateway class.
     *
     * @var array<string,class-string<PaymentGateway>>
     */
    protected array $map = [
        'sslcommerz' => SslCommerzGateway::class,
        'bkash'      => BkashGateway::class,
        'nagad'      => NagadGateway::class,
    ];

    /**
     * Resolve a gateway instance for the given method + store, merging
     * per-store PaymentMethod credentials over env-level config defaults.
     */
    public function resolve(string $method, Store $store): PaymentGateway
    {
        $method = strtolower($method);

        if (! isset($this->map[$method])) {
            throw new PaymentGatewayException(
                "Unsupported payment gateway: {$method}",
                $method,
                ['store_id' => $store->id],
            );
        }

        $defaults = (array) config("payments.gateways.{$method}", []);
        $overrides = $this->storeOverrides($method, $store);

        // Deep merge: store overrides win.
        $config = array_replace_recursive($defaults, $overrides);

        $class = $this->map[$method];

        return new $class($config);
    }

    /**
     * Pull per-store PaymentMethod row and extract credentials / metadata.
     *
     * @return array<string,mixed>
     */
    protected function storeOverrides(string $method, Store $store): array
    {
        /** @var PaymentMethod|null $row */
        $row = PaymentMethod::query()
            ->where('store_id', $store->id)
            ->where('provider', $method)
            ->where('is_active', true)
            ->first();

        if (! $row) {
            return [];
        }

        $overrides = [];

        if ($row->is_test_mode !== null) {
            $overrides['is_sandbox'] = (bool) $row->is_test_mode;
        }

        // credentials_encrypted is stored as Crypt::encryptString(json_encode([...])).
        if (! empty($row->credentials_encrypted)) {
            try {
                $decrypted = Crypt::decryptString($row->credentials_encrypted);
                $creds = json_decode($decrypted, true);
                if (is_array($creds)) {
                    $overrides = array_merge($overrides, $creds);
                }
            } catch (Throwable) {
                // Silently ignore: fall back to env defaults.
            }
        }

        if (is_array($row->metadata)) {
            $overrides = array_merge($overrides, $row->metadata);
        }

        return $overrides;
    }
}
