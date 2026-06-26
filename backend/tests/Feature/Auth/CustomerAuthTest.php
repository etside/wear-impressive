<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_customer_registration_requires_store_context(): void
    {
        $response = $this->postJson('/api/customer/register', [
            'name' => 'John',
            'email' => 'j@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ]);

        // On bare localhost with no X-Store-Handle, ResolveStore passes through and
        // EnsureStoreContext rejects the request with 400.
        $response->assertStatus(400);
    }

    public function test_customer_can_register_and_login_with_store_handle(): void
    {
        $store = $this->createStore();

        $register = $this->postJson('/api/customer/register', [
            'name' => 'Jane Customer',
            'email' => 'jane@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ], $this->withStoreHandle($store));

        $register->assertStatus(201)
            ->assertJsonStructure(['data' => ['customer' => ['id'], 'token']]);

        $this->assertDatabaseHas('customers', [
            'store_id' => $store->id,
            'email' => 'jane@example.com',
        ]);

        $login = $this->postJson('/api/customer/login', [
            'email' => 'jane@example.com',
            'password' => 'Secret123!',
        ], $this->withStoreHandle($store));

        $login->assertStatus(200)
            ->assertJsonStructure(['data' => ['customer', 'token']]);

        $token = $login->json('data.token');

        $me = $this->getJson('/api/customer/me', $this->withStoreHandle($store, $this->bearer($token)));

        $me->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.customer.email', 'jane@example.com');
    }
}
