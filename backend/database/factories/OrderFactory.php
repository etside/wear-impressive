<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $subtotal = $this->faker->numberBetween(500, 5000);

        return [
            'store_id' => Store::factory(),
            'order_number' => 'ORD-'.strtoupper(Str::random(8)),
            'customer_id' => null,
            'guest_email' => $this->faker->safeEmail(),
            'guest_phone' => '017'.$this->faker->numerify('########'),
            'guest_name' => $this->faker->name(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'subtotal' => $subtotal,
            'discount_amount' => 0,
            'shipping_amount' => 80,
            'tax_amount' => 0,
            'total' => $subtotal + 80,
            'currency' => 'BDT',
            'payment_method' => 'cod',
            'shipping_address' => [
                'full_name' => $this->faker->name(),
                'phone' => '017'.$this->faker->numerify('########'),
                'address_line_1' => $this->faker->streetAddress(),
                'district' => 'Dhaka',
                'thana' => 'Gulshan',
            ],
            'billing_address' => [
                'full_name' => $this->faker->name(),
                'phone' => '017'.$this->faker->numerify('########'),
                'address_line_1' => $this->faker->streetAddress(),
                'district' => 'Dhaka',
                'thana' => 'Gulshan',
            ],
        ];
    }
}
