<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    public function definition(): array
    {
        $price = $this->faker->numberBetween(100, 1000);
        $qty = $this->faker->numberBetween(1, 3);

        return [
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'product_name' => $this->faker->words(3, true),
            'sku' => strtoupper($this->faker->lexify('????????')),
            'price' => $price,
            'discount' => 0,
            'tax_rate' => 0,
            'quantity' => $qty,
            'subtotal' => $price * $qty,
            'total' => $price * $qty,
        ];
    }
}
