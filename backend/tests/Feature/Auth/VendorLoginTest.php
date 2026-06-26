<?php

namespace Tests\Feature\Auth;

use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class VendorLoginTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    public function test_vendor_can_login_with_correct_credentials(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create([
            'store_id' => $store->id,
            'email' => 'owner@example.com',
            'password' => 'Secret123!',
        ]);

        $response = $this->postJson('/api/vendor/login', [
            'email' => 'owner@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => ['vendor', 'store', 'token', 'token_type'],
            ]);
    }

    public function test_wrong_password_returns_401(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create([
            'store_id' => $store->id,
            'email' => 'owner2@example.com',
            'password' => 'Secret123!',
        ]);

        $response = $this->postJson('/api/vendor/login', [
            'email' => 'owner2@example.com',
            'password' => 'WrongPass!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_login_is_rate_limited_after_many_attempts(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create([
            'store_id' => $store->id,
            'email' => 'owner3@example.com',
            'password' => 'Secret123!',
        ]);

        // Throttle is 10 per minute for /vendor/register|login|forgot-password|reset-password routes.
        // Burn through all 10 with wrong password first, then expect 429 on #11.
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/vendor/login', [
                'email' => 'owner3@example.com',
                'password' => 'WrongPass!',
            ]);
        }

        $response = $this->postJson('/api/vendor/login', [
            'email' => 'owner3@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(429);
    }
}
