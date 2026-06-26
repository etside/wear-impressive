<?php

namespace Tests\Feature\Storefront;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class StoreInfoTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    public function test_store_info_returns_payload_for_valid_handle(): void
    {
        $store = $this->createStore(['name' => 'Demo', 'handle' => 'demo-info']);

        $response = $this->getJson('/api/store/info', $this->withStoreHandle($store));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['store', 'theme', 'settings', 'menus'],
            ])
            ->assertJsonPath('data.store.handle', 'demo-info')
            ->assertJsonPath('data.store.name', 'Demo');
    }

    public function test_missing_store_context_returns_400(): void
    {
        // No X-Store-Handle, no subdomain — bareHost check lets request through
        // until EnsureStoreContext rejects it.
        $response = $this->getJson('/api/store/info', [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(400);
    }

    public function test_unknown_store_handle_falls_through_to_400(): void
    {
        // Header set but handle not found, and host is localhost → middleware treats
        // as "no store context" and EnsureStoreContext returns 400.
        $response = $this->getJson('/api/store/info', [
            'X-Store-Handle' => 'non-existent',
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(400);
    }

    public function test_suspended_store_is_not_resolvable(): void
    {
        $store = $this->createStore(['status' => 'suspended']);

        $response = $this->getJson('/api/store/info', $this->withStoreHandle($store));

        // ResolveStoreMiddleware rejects non-active stores with 404.
        $response->assertStatus(404);
    }
}
