<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = $this->faker->words(3, true);

        return [
            'store_id' => Store::factory(),
            'vendor_id' => Vendor::factory(),
            'category_id' => function (array $attrs) {
                $category = ProductCategory::query()
                    ->where('store_id', $attrs['store_id'])
                    ->first();

                if (! $category) {
                    $category = ProductCategory::create([
                        'store_id' => $attrs['store_id'],
                        'name' => 'General',
                        'slug' => 'general-'.Str::lower(Str::random(6)),
                        'is_active' => true,
                    ]);
                }

                return $category->id;
            },
            'product_type' => 'physical',
            'name' => ucfirst($name),
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'short_description' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'price' => $this->faker->numberBetween(100, 9999),
            'sku' => strtoupper(Str::random(8)),
            'barcode' => (string) $this->faker->unique()->ean13(),
            'weight_value' => 0.5,
            'weight_unit' => 'kg',
            'has_variants' => false,
            'track_inventory' => true,
            'stock' => 100,
            'low_stock_threshold' => 5,
            'status' => 'active',
            'is_taxable' => false,
            'tax_rate' => 0,
            'published_at' => now(),
        ];
    }

    public function draft(): self
    {
        return $this->state(fn () => ['status' => 'draft', 'published_at' => null]);
    }

    public function outOfStock(): self
    {
        return $this->state(fn () => ['stock' => 0]);
    }
}
