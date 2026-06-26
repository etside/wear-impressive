<?php

namespace App\Services\Couriers;

use App\Exceptions\CourierGatewayException;
use App\Models\DeliveryPartner;
use App\Models\Store;
use App\Services\Couriers\Contracts\CourierGateway;
use App\Services\Couriers\Gateways\PaperflyGateway;
use App\Services\Couriers\Gateways\PathaoGateway;
use App\Services\Couriers\Gateways\RedXGateway;
use App\Services\Couriers\Gateways\SteadfastGateway;
use App\Services\Couriers\Gateways\SundarbanGateway;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class CourierGatewayResolver
{
    /**
     * Resolve a courier gateway instance for the given partner slug and store.
     * Merges per-store DeliveryPartner credentials/settings over env defaults.
     */
    public function resolve(string $partner, Store $store): CourierGateway
    {
        $partner = strtolower(trim($partner));

        $row = DeliveryPartner::where('store_id', $store->id)
            ->where('provider', $partner)
            ->first();

        $config = (array) config('couriers.'.$partner, []);

        if ($row) {
            $config['is_test_mode'] = (bool) $row->is_test_mode;

            $settings = is_array($row->settings) ? $row->settings : [];
            foreach ($settings as $k => $v) {
                if ($v !== null && $v !== '') {
                    $config[$k] = $v;
                }
            }

            $creds = $this->decryptCredentials($row->credentials_encrypted);
            foreach ($creds as $k => $v) {
                if ($v !== null && $v !== '') {
                    $config[$k] = $v;
                }
            }

            $config['_delivery_partner_id'] = $row->id;
        }

        return match ($partner) {
            'pathao'    => new PathaoGateway($config),
            'steadfast' => new SteadfastGateway($config),
            'redx'      => new RedXGateway($config),
            'sundarban' => new SundarbanGateway($config),
            'paperfly'  => new PaperflyGateway($config),
            default     => throw new CourierGatewayException(
                "Unknown courier partner: {$partner}",
                $partner,
            ),
        };
    }

    protected function decryptCredentials(?string $encrypted): array
    {
        if (! $encrypted) {
            return [];
        }

        try {
            $decoded = Crypt::decryptString($encrypted);
            $json = json_decode($decoded, true);

            return is_array($json) ? $json : [];
        } catch (Throwable) {
            return [];
        }
    }
}
