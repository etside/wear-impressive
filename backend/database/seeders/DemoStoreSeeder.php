<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoStoreSeeder extends Seeder
{
    public function run(): void
    {
        $store = Store::where('handle', 'test-store')->first();
        if (! $store) {
            $this->command->warn('No test-store found. Skipping demo seeding.');
            return;
        }

        $vendor = Vendor::where('store_id', $store->id)->first();
        if (! $vendor) {
            $this->command->warn('No vendor found for test-store. Skipping demo seeding.');
            return;
        }

        $this->command->info("Seeding demo data into store #{$store->id} ({$store->handle}).");

        $categories = $this->seedCategories($store->id);
        $brands = $this->seedBrands($store->id);
        $this->seedProducts($store->id, $vendor->id, $categories, $brands);

        $this->command->info('Demo seeding complete.');
    }

    protected function seedCategories(int $storeId): array
    {
        $data = [
            ['name' => 'Fashion', 'icon_name' => 'shirt'],
            ['name' => 'Electronics', 'icon_name' => 'smartphone'],
            ['name' => 'Home & Living', 'icon_name' => 'home'],
            ['name' => 'Beauty', 'icon_name' => 'sparkles'],
            ['name' => 'Grocery', 'icon_name' => 'shopping-bag'],
            ['name' => 'Books', 'icon_name' => 'book-open'],
        ];

        $map = [];
        foreach ($data as $i => $row) {
            $cat = ProductCategory::updateOrCreate(
                ['store_id' => $storeId, 'slug' => Str::slug($row['name'])],
                [
                    'name' => $row['name'],
                    'description' => "Shop our {$row['name']} collection.",
                    'icon_type' => 'lucide',
                    'icon_name' => $row['icon_name'],
                    'sort_order' => $i,
                    'is_active' => true,
                ]
            );
            $map[$row['name']] = $cat->id;
        }
        return $map;
    }

    protected function seedBrands(int $storeId): array
    {
        $data = [
            ['name' => 'Dhaka Style', 'featured' => true],
            ['name' => 'Bengal Craft', 'featured' => true],
            ['name' => 'Pahari Tea Co.', 'featured' => false],
            ['name' => 'TechBD', 'featured' => true],
            ['name' => 'Padma Essentials', 'featured' => false],
        ];

        $map = [];
        foreach ($data as $row) {
            $brand = Brand::updateOrCreate(
                ['store_id' => $storeId, 'slug' => Str::slug($row['name'])],
                [
                    'name' => $row['name'],
                    'description' => "Quality products by {$row['name']}.",
                    'featured' => $row['featured'],
                    'is_active' => true,
                ]
            );
            $map[$row['name']] = $brand->id;
        }
        return $map;
    }

    protected function seedProducts(int $storeId, int $vendorId, array $categories, array $brands): void
    {
        $products = [
            [
                'name' => 'Cotton Panjabi', 'price' => 1290, 'discount' => 200, 'discount_type' => 'flat',
                'category' => 'Fashion', 'brand' => 'Dhaka Style',
                'short_description' => 'Soft handloom cotton panjabi with embroidered collar.',
                'tags' => ['men', 'festive', 'cotton'],
                'image' => 'https://images.unsplash.com/photo-1622445275576-721325763afe?w=800&q=80',
            ],
            [
                'name' => 'Jamdani Saree', 'price' => 4500, 'discount' => 500, 'discount_type' => 'flat',
                'category' => 'Fashion', 'brand' => 'Bengal Craft',
                'short_description' => 'Traditional Jamdani saree with geometric motifs.',
                'tags' => ['women', 'saree', 'traditional'],
                'image' => 'https://images.unsplash.com/photo-1610189020542-1aa6c4f2b3c6?w=800&q=80',
            ],
            [
                'name' => 'Wireless Earbuds X1', 'price' => 2499, 'discount' => 15, 'discount_type' => 'percent',
                'category' => 'Electronics', 'brand' => 'TechBD',
                'short_description' => 'Bluetooth 5.3, 24h battery, active noise cancellation.',
                'tags' => ['audio', 'bluetooth', 'wireless'],
                'image' => 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&q=80',
            ],
            [
                'name' => 'Smart Watch Pro', 'price' => 5990, 'discount' => 0, 'discount_type' => null,
                'category' => 'Electronics', 'brand' => 'TechBD',
                'short_description' => 'Heart rate, SpO2, GPS, and 14-day battery life.',
                'tags' => ['wearable', 'fitness'],
                'image' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
            ],
            [
                'name' => 'Nakshi Katha Throw', 'price' => 1850, 'discount' => 0, 'discount_type' => null,
                'category' => 'Home & Living', 'brand' => 'Bengal Craft',
                'short_description' => 'Hand-stitched Nakshi kantha blanket — 100% cotton.',
                'tags' => ['home', 'handmade'],
                'image' => 'https://images.unsplash.com/photo-1528822855841-c7e4eb1ccffc?w=800&q=80',
            ],
            [
                'name' => 'Darjeeling First Flush Tea', 'price' => 650, 'discount' => 10, 'discount_type' => 'percent',
                'category' => 'Grocery', 'brand' => 'Pahari Tea Co.',
                'short_description' => 'Premium loose-leaf black tea — 250g tin.',
                'tags' => ['tea', 'organic', 'premium'],
                'image' => 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
            ],
            [
                'name' => 'Neem & Tulsi Face Wash', 'price' => 390, 'discount' => 0, 'discount_type' => null,
                'category' => 'Beauty', 'brand' => 'Padma Essentials',
                'short_description' => 'Gentle daily cleanser with natural neem and tulsi.',
                'tags' => ['skincare', 'natural'],
                'image' => 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
            ],
            [
                'name' => 'Handwoven Terracotta Mug Set', 'price' => 890, 'discount' => 0, 'discount_type' => null,
                'category' => 'Home & Living', 'brand' => 'Bengal Craft',
                'short_description' => 'Set of 4 clay mugs, kiln-fired in Bangladesh.',
                'tags' => ['kitchen', 'handmade'],
                'image' => 'https://images.unsplash.com/photo-1578079585265-8c5df2f9c5c2?w=800&q=80',
            ],
            [
                'name' => 'Rabindranath Tagore — Gitanjali', 'price' => 320, 'discount' => 0, 'discount_type' => null,
                'category' => 'Books', 'brand' => 'Padma Essentials',
                'short_description' => 'Paperback edition, English translation.',
                'tags' => ['book', 'poetry', 'classic'],
                'image' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
            ],
            [
                'name' => 'Basmati Rice 5kg', 'price' => 1100, 'discount' => 50, 'discount_type' => 'flat',
                'category' => 'Grocery', 'brand' => 'Padma Essentials',
                'short_description' => 'Long-grain aromatic rice, ideal for biryani and pulao.',
                'tags' => ['rice', 'staple'],
                'image' => 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
            ],
            [
                'name' => 'Denim Jacket — Slim Fit', 'price' => 2490, 'discount' => 20, 'discount_type' => 'percent',
                'category' => 'Fashion', 'brand' => 'Dhaka Style',
                'short_description' => 'Classic indigo wash, 100% cotton denim.',
                'tags' => ['men', 'denim', 'jacket'],
                'image' => 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80',
            ],
            [
                'name' => '4K Action Camera', 'price' => 8990, 'discount' => 1000, 'discount_type' => 'flat',
                'category' => 'Electronics', 'brand' => 'TechBD',
                'short_description' => 'Waterproof, 4K/60fps, image stabilization.',
                'tags' => ['camera', 'adventure'],
                'image' => 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=800&q=80',
            ],
        ];

        foreach ($products as $row) {
            Product::updateOrCreate(
                ['store_id' => $storeId, 'slug' => Str::slug($row['name'])],
                [
                    'vendor_id' => $vendorId,
                    'category_id' => $categories[$row['category']] ?? null,
                    'brand_id' => $brands[$row['brand']] ?? null,
                    'product_type' => 'physical',
                    'name' => $row['name'],
                    'short_description' => $row['short_description'],
                    'description' => '<p>'.$row['short_description'].'</p><p>Authentic, ethically sourced, and shipped across Bangladesh within 2–4 days.</p>',
                    'price' => $row['price'],
                    'discount' => $row['discount'] ?: null,
                    'discount_type' => $row['discount_type'],
                    'sku' => 'DEMO-'.strtoupper(Str::random(6)),
                    'weight_value' => 0.5,
                    'weight_unit' => 'kg',
                    'has_variants' => false,
                    'track_inventory' => true,
                    'stock' => rand(15, 120),
                    'low_stock_threshold' => 5,
                    'images' => [$row['image']],
                    'featured_image' => $row['image'],
                    'cover_image' => $row['image'],
                    'tags' => $row['tags'],
                    'status' => 'active',
                    'is_taxable' => false,
                    'published_at' => now(),
                ]
            );
        }
    }
}
