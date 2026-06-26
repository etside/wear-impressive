<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\CmsPage;
use App\Models\NavigationMenu;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use App\Models\Store;
use App\Models\StoreSetting;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Imports the Wear Impressive brand (wearimpressive.com) as a tenant store on
 * the eTommerce platform — full content pull: logo, category tree, products,
 * t-shirt lineup for the 1250 combo, CMS pages (About/Contact/Shipping/Return/Privacy/Terms/FAQ),
 * nav menu, accurate shipping zones, hero copy, review gallery.
 *
 *   Handle:  wi
 *   Vendor:  owner@wearimpressive.com / password
 *   Preview: http://wi.localhost:3000/store  (dev) ·  https://wi.etommerce.com  (prod)
 */
class WearImpressiveSeeder extends Seeder
{
    protected Store $store;
    protected Vendor $vendor;
    protected array $downloadedImages = [];

    public function run(): void
    {
        $this->store = $this->createStore();
        $this->vendor = $this->createVendor($this->store);

        $this->downloadAllImages();
        $this->seedStoreSettings($this->store);
        $this->seedShippingZones($this->store);
        $categories = $this->seedCategoryTree($this->store);
        $brand = $this->seedBrand($this->store);
        $this->seedCargoPants($this->store, $this->vendor, $categories['cargo-pants'], $brand);
        $this->seedTshirts($this->store, $this->vendor, $categories['t-shirts'], $brand);
        $this->seedCmsPages($this->store);
        $this->seedNavMenus($this->store);

        $this->command->info('─────────────────────────────────────');
        $this->command->info('Wear Impressive seeded from live site.');
        $this->command->info('  handle:      '.$this->store->handle);
        $this->command->info('  vendor:      owner@wearimpressive.com / password');
        $this->command->info('  products:    '.Product::where('store_id', $this->store->id)->count());
        $this->command->info('  variants:    '.ProductVariant::whereIn('product_id', Product::where('store_id', $this->store->id)->pluck('id'))->count());
        $this->command->info('  categories:  '.ProductCategory::where('store_id', $this->store->id)->count());
        $this->command->info('  cms pages:   '.CmsPage::where('store_id', $this->store->id)->count());
        $this->command->info('  nav menus:   '.NavigationMenu::where('store_id', $this->store->id)->count());
        $this->command->info('  images:      '.count($this->downloadedImages));
        $this->command->info('  storefront:  http://wi.localhost:3000/store');
        $this->command->info('  dashboard:   http://wi.localhost:3000/login');
        $this->command->info('─────────────────────────────────────');
    }

    /* ─────────────── Store + vendor ─────────────── */

    protected function createStore(): Store
    {
        return Store::updateOrCreate(
            ['handle' => 'wi'],
            [
                'name' => 'Wear Impressive',
                'email' => 'owner@wearimpressive.com',
                'phone' => '+8801993008596',
                'country' => 'BD',
                'currency' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'primary_language' => 'both',
                'description' => 'Impress with every outfit. Bangladesh\'s trusted fashion brand for premium denim cargos and cotton tees. 4 years of happy customers.',
                'address_line_1' => 'Dhaka, Bangladesh',
                'division' => 'Dhaka',
                'district' => 'Dhaka',
                'status' => 'active',
                'plan' => 'pro',
                'trial_ends_at' => now()->addDays(30),
                'onboarding_completed' => false,
            ],
        );
    }

    protected function createVendor(Store $store): Vendor
    {
        $vendor = Vendor::updateOrCreate(
            ['email' => 'owner@wearimpressive.com'],
            [
                'store_id' => $store->id,
                'name' => 'Wear Impressive Admin',
                'phone' => '+8801993008596',
                'password' => Hash::make('password'),
                'role' => 'owner',
                'last_login_at' => now(),
            ],
        );

        return $vendor;
    }

    /* ─────────────── Asset mirroring ─────────────── */

    protected function downloadAllImages(): void
    {
        $assets = [
            // Logo
            'logo' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Logo-New-2025-2-1024x493.png',

            // Color-effect hero shots
            'sky-black-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Sky-Black-Effect-1.jpg',
            'sky-white-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Sky-White-Effect-2.jpg',
            'black-black-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Black-Black-Effect-1.jpg',
            'black-white-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Black-White-Effect-3.jpg',
            'blue-black-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Blue-Black-Effect-2.jpg',
            'blue-white-effect' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Blue-White-Effect-2.jpg',

            // Lifestyle / detail shots
            'lifestyle-1' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_0905-2-768x1024.jpg',
            'lifestyle-2' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_0982-1-768x1024.jpg',
            'lifestyle-3' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_0983-1-768x1024.jpg',
            'lifestyle-4' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_1115-1-768x1024.jpg',
            'lifestyle-5' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_1119-1-768x1024.jpg',
            'lifestyle-6' => 'https://wearimpressive.com/wp-content/uploads/2025/08/IMG_1126-1-768x1024.jpg',

            // Square thumbs
            'sky-square' => 'https://wearimpressive.com/wp-content/uploads/2025/08/sky-pant-300x300.jpg',
            'black-square' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Black-Pant-300x300.jpg',
            'blue-square' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Blue-Pant-300x300.jpg',

            // Size chart
            'size-chart' => 'https://wearimpressive.com/wp-content/uploads/2025/08/Size-chart-1024x559.jpg',
        ];

        // Customer reviews gallery
        for ($i = 1; $i <= 10; $i++) {
            $assets["review-{$i}"] = "https://wearimpressive.com/wp-content/uploads/2025/08/r{$i}.jpg";
        }

        foreach ($assets as $key => $remote) {
            $ext = strtolower(pathinfo(parse_url($remote, PHP_URL_PATH), PATHINFO_EXTENSION)) ?: 'jpg';
            $path = "stores/{$this->store->id}/assets/{$key}.{$ext}";

            if (! Storage::disk('public')->exists($path)) {
                try {
                    $response = Http::timeout(15)
                        ->withHeaders(['User-Agent' => 'eTommerce-Importer/1.0'])
                        ->get($remote);
                    if ($response->ok()) {
                        Storage::disk('public')->put($path, $response->body());
                    } else {
                        $this->command?->warn("  skipped ({$response->status()}): {$remote}");
                        continue;
                    }
                } catch (\Throwable $e) {
                    $this->command?->warn("  failed: {$remote}");
                    continue;
                }
            }
            $this->downloadedImages[$key] = Storage::disk('public')->url($path);
        }
    }

    protected function img(string $key): ?string
    {
        return $this->downloadedImages[$key] ?? null;
    }

    /* ─────────────── Settings + shipping ─────────────── */

    protected function seedStoreSettings(Store $store): void
    {
        $logoUrl = $this->img('logo');

        // Update the store's logo column if we have one
        if ($logoUrl) {
            $store->update(['logo' => $logoUrl]);
        }

        $settings = [
            'checkout.guest_enabled' => 'true',
            'checkout.require_phone' => 'true',
            'notifications.email_enabled' => 'true',
            'notifications.sms_enabled' => 'false',

            // SEO
            'seo.meta_title' => 'Wear Impressive — Impress with every outfit',
            'seo.meta_description' => 'Premium women\'s denim cargo pants and rib cotton t-shirts. Combo offer: 1 cargo pant + 2 t-shirts for only 1250 BDT. Fast delivery across Bangladesh.',

            // Theme
            'theme.active_id' => 'boutique',

            // Social
            'contact.facebook' => 'https://www.facebook.com/wearimpressivee',
            'contact.youtube' => 'https://www.youtube.com/@wearimpressive',
            'contact.tiktok' => 'https://www.tiktok.com/@wear.impressive',
            'contact.whatsapp' => '+8801993008596',
            'contact.whatsapp_url' => 'https://wa.me/8801993008596',

            // Hero / promo (both languages — the storefront can pick based on locale)
            'hero.tagline_en' => 'Impress with every outfit',
            'hero.tagline_bn' => 'স্মার্ট লুকের সেরা কম্বো — এখন তোমার হাতের নাগালে',
            'hero.subtitle_en' => 'Premium denim cargo pants + rib-cotton t-shirts',
            'hero.subtitle_bn' => '৬ পকেটের লেডিস ব্যাগি কার্গো প্যান্ট এবং প্রিমিয়াম রিব টিশার্ট',
            'hero.cta_text' => 'Shop the combo',
            'hero.cta_link' => '/store/products',

            // Promo banner
            'promo.banner_en' => 'Combo offer — 1 cargo pant + 2 t-shirts for only 1250 BDT',
            'promo.banner_bn' => 'কম্বো অফার — ১টি কার্গো প্যান্ট এবং ২টি টিশার্ট মাত্র ১২৫০ টাকায়',

            // Legacy
            'legacy.origin_site' => 'https://wearimpressive.com',
            'legacy.imported_at' => now()->toIso8601String(),

            // Review gallery (comma-separated URLs storefront can render)
            'social.review_gallery' => implode(',', array_filter([
                $this->img('review-1'), $this->img('review-2'), $this->img('review-3'),
                $this->img('review-4'), $this->img('review-5'), $this->img('review-6'),
                $this->img('review-7'), $this->img('review-8'), $this->img('review-9'),
                $this->img('review-10'),
            ])),

            // Size chart
            'product.size_chart_image' => $this->img('size-chart') ?? '',

            // Why choose us
            'about.pitch_1' => 'Every outfit made under our own supervision',
            'about.pitch_2' => 'Never compromise on quality',
            'about.pitch_3' => 'Lowest prices without cutting corners',
            'about.pitch_4' => '4 years of happy customers',
        ];

        foreach ($settings as $key => $value) {
            StoreSetting::updateOrCreate(
                ['store_id' => $store->id, 'key' => $key],
                ['value' => $value],
            );
        }
    }

    protected function seedShippingZones(Store $store): void
    {
        ShippingZone::updateOrCreate(
            ['store_id' => $store->id, 'name' => 'Dhaka City'],
            [
                'districts' => ['Dhaka'],
                'coverage' => ['country' => 'BD', 'scope' => 'city'],
                'flat_rate' => 70,
                'free_shipping_threshold' => null,
                'delivery_estimate' => '1–2 business days',
                'is_active' => true,
            ],
        );
        ShippingZone::updateOrCreate(
            ['store_id' => $store->id, 'name' => 'Dhaka District (Sub-urban)'],
            [
                'districts' => ['Gazipur', 'Narayanganj', 'Manikganj', 'Munshiganj', 'Narsingdi'],
                'coverage' => ['country' => 'BD', 'scope' => 'dhaka-district'],
                'flat_rate' => 120,
                'free_shipping_threshold' => null,
                'delivery_estimate' => '2–3 business days',
                'is_active' => true,
            ],
        );
        ShippingZone::updateOrCreate(
            ['store_id' => $store->id, 'name' => 'Outside Dhaka (Rest of Bangladesh)'],
            [
                'districts' => null,
                'coverage' => ['country' => 'BD', 'scope' => 'rest'],
                'flat_rate' => 150,
                'free_shipping_threshold' => null,
                'delivery_estimate' => '3–5 business days',
                'is_active' => true,
            ],
        );
    }

    /* ─────────────── Categories ─────────────── */

    /**
     * @return array<string,ProductCategory>
     */
    protected function seedCategoryTree(Store $store): array
    {
        $womensClothing = ProductCategory::updateOrCreate(
            ['store_id' => $store->id, 'slug' => 'womens-clothing'],
            [
                'name' => 'Women\'s Clothing',
                'description' => 'Everyday wear for the modern woman.',
                'icon_type' => 'lucide', 'icon_name' => 'shirt',
                'sort_order' => 1, 'is_active' => true,
                'parent_id' => null,
            ],
        );

        $accessories = ProductCategory::updateOrCreate(
            ['store_id' => $store->id, 'slug' => 'accessories'],
            [
                'name' => 'Accessories',
                'description' => 'Bags, jewelry and finishing touches.',
                'icon_type' => 'lucide', 'icon_name' => 'watch',
                'sort_order' => 2, 'is_active' => true,
                'parent_id' => null,
            ],
        );

        $childrenData = [
            // women's clothing children
            'cargo-pants' => ['Cargo Pants', 'High-waist 6-pocket denim cargos.', 'shirt', $womensClothing->id, 10],
            't-shirts' => ['T-Shirts', 'Premium rib-cotton tees.', 'shirt', $womensClothing->id, 20],
            'jeans-denim' => ['Jeans & Denim', 'Everyday denim staples.', 'shirt', $womensClothing->id, 30],
            'dresses' => ['Dresses', 'From casual to formal.', 'shirt', $womensClothing->id, 40],
            'kurtis' => ['Kurtis', 'Traditional and modern cuts.', 'shirt', $womensClothing->id, 50],
            'sarees' => ['Sarees', 'Everyday and festive sarees.', 'shirt', $womensClothing->id, 60],
            'salwar-kameez' => ['Salwar Kameez', 'Three-piece sets and unstitched fabrics.', 'shirt', $womensClothing->id, 70],
            'loungewear' => ['Loungewear', 'Soft at-home essentials.', 'shirt', $womensClothing->id, 80],
            'combos' => ['Combos & Bundles', 'Save more with curated combos.', 'package', $womensClothing->id, 90],
            // accessories children
            'bags' => ['Bags', 'Everyday and statement bags.', 'shopping-bag', $accessories->id, 10],
            'jewelry' => ['Jewelry', 'Delicate pieces and statement sets.', 'gem', $accessories->id, 20],
            'scarves' => ['Scarves & Dupattas', 'Add a layer of colour.', 'shirt', $accessories->id, 30],
        ];

        $out = ['womens-clothing' => $womensClothing, 'accessories' => $accessories];

        foreach ($childrenData as $slug => [$name, $desc, $icon, $parentId, $order]) {
            $out[$slug] = ProductCategory::updateOrCreate(
                ['store_id' => $store->id, 'slug' => $slug],
                [
                    'name' => $name,
                    'description' => $desc,
                    'icon_type' => 'lucide',
                    'icon_name' => $icon,
                    'sort_order' => $order,
                    'is_active' => true,
                    'parent_id' => $parentId,
                ],
            );
        }

        return $out;
    }

    protected function seedBrand(Store $store): Brand
    {
        return Brand::updateOrCreate(
            ['store_id' => $store->id, 'slug' => 'wear-impressive'],
            [
                'name' => 'Wear Impressive',
                'description' => 'Our in-house label — impress with every outfit.',
                'logo_type' => 'upload',
                'logo_url' => $this->img('logo'),
                'featured' => true,
                'is_active' => true,
            ],
        );
    }

    /* ─────────────── Products ─────────────── */

    protected function cargoDescription(string $color): string
    {
        return <<<HTML
<p><strong>Impress with every outfit.</strong> Our flagship 6-pocket denim cargo pants in {$color} — the high-waist cut that started it all.</p>

<h4>Features</h4>
<ul>
  <li>High-waist cut, sits naturally at the navel</li>
  <li>6 functional pockets (2 side, 2 cargo, 2 back)</li>
  <li>Durable denim / jeans fabric with a soft hand-feel</li>
  <li>Baggy relaxed fit</li>
  <li>Machine washable — cold wash, low tumble</li>
</ul>

<h4>Sizing</h4>
<p>Measurements are taken around the waist at the navel (high-waist). Available in sizes 26–42. See our <strong>size chart</strong> tab for detailed measurements.</p>

<h4>Combo offer</h4>
<p>Pair this cargo with any 2 of our premium rib-cotton tees for only <strong>1250 BDT</strong>.</p>

<h4>Delivery</h4>
<p>Dhaka city: 1–2 days (70 BDT) · Dhaka district: 2–3 days (120 BDT) · Outside Dhaka: 3–5 days (150 BDT). <strong>Cash on delivery</strong> available everywhere.</p>
HTML;
    }

    protected function seedCargoPants(Store $store, Vendor $vendor, ProductCategory $category, Brand $brand): void
    {
        $sizes = ['26', '28', '30', '32', '34', '36', '38', '40', '42'];

        $variants = [
            [
                'slug' => '6-pocket-denim-cargo-sky',
                'name' => '6 Pocket Denim Cargo — Sky Blue',
                'price' => 750, 'sku' => 'WI-CARGO-SKY',
                'color' => 'Sky Blue',
                'images' => array_filter([
                    $this->img('sky-black-effect'), $this->img('sky-white-effect'),
                    $this->img('sky-square'),
                ]),
            ],
            [
                'slug' => '6-pocket-denim-cargo-black',
                'name' => '6 Pocket Denim Cargo — Black',
                'price' => 800, 'sku' => 'WI-CARGO-BLK',
                'color' => 'Black',
                'images' => array_filter([
                    $this->img('black-black-effect'), $this->img('black-white-effect'),
                    $this->img('black-square'), $this->img('lifestyle-1'),
                ]),
            ],
            [
                'slug' => '6-pocket-denim-cargo-mid-blue',
                'name' => '6 Pocket Denim Cargo — Mid Blue',
                'price' => 750, 'sku' => 'WI-CARGO-MID',
                'color' => 'Mid Blue',
                'images' => array_filter([
                    $this->img('blue-black-effect'), $this->img('blue-white-effect'),
                    $this->img('blue-square'), $this->img('lifestyle-4'), $this->img('lifestyle-6'),
                ]),
            ],
        ];

        foreach ($variants as $i => $v) {
            $product = Product::updateOrCreate(
                ['store_id' => $store->id, 'slug' => $v['slug']],
                [
                    'vendor_id' => $vendor->id,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'product_type' => 'physical',
                    'name' => $v['name'],
                    'short_description' => 'High-waist women\'s 6-pocket denim cargo pants in '.$v['color'].'. Premium fabric, perfect fit.',
                    'description' => $this->cargoDescription($v['color']),
                    'price' => $v['price'],
                    'sku' => $v['sku'],
                    'weight_value' => 0.6,
                    'weight_unit' => 'kg',
                    'has_variants' => true,
                    'track_inventory' => true,
                    'stock' => 0,
                    'low_stock_threshold' => 5,
                    'images' => array_values($v['images']),
                    'featured_image' => $v['images'][0] ?? null,
                    'cover_image' => $v['images'][0] ?? null,
                    'tags' => ['cargo', 'denim', 'women', 'high-waist', '6-pocket', $v['color']],
                    'status' => 'active',
                    'is_taxable' => false,
                    'published_at' => now(),
                ],
            );

            foreach ($sizes as $size) {
                ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => $v['sku'].'-'.$size],
                    [
                        'options' => ['Size' => $size],
                        'price' => $v['price'],
                        'stock' => 20,
                        'is_active' => true,
                    ],
                );
            }
        }
    }

    protected function seedTshirts(Store $store, Vendor $vendor, ProductCategory $category, Brand $brand): void
    {
        $description = <<<'HTML'
<p>Premium rib-cotton t-shirt — the perfect match for our denim cargos. Soft hand-feel, structured rib fabric, and a flattering 23-inch length.</p>

<h4>Features</h4>
<ul>
  <li>100% premium rib cotton</li>
  <li>23 inches length — hits at the hip</li>
  <li>Relaxed neckline, no tag itch</li>
  <li>Machine wash cold, dry flat to keep shape</li>
</ul>

<h4>Combo offer</h4>
<p>Buy <strong>2 t-shirts + any cargo pant</strong> and pay only <strong>1250 BDT</strong>. Mix and match colours freely.</p>
HTML;

        $colors = [
            ['slug' => 'rib-cotton-tshirt-white', 'name' => 'Rib Cotton T-Shirt — White',   'sku' => 'WI-TEE-WHT', 'color' => 'White'],
            ['slug' => 'rib-cotton-tshirt-black', 'name' => 'Rib Cotton T-Shirt — Black',   'sku' => 'WI-TEE-BLK', 'color' => 'Black'],
            ['slug' => 'rib-cotton-tshirt-olive', 'name' => 'Rib Cotton T-Shirt — Olive',   'sku' => 'WI-TEE-OLV', 'color' => 'Olive'],
            ['slug' => 'rib-cotton-tshirt-pink',  'name' => 'Rib Cotton T-Shirt — Dusty Pink', 'sku' => 'WI-TEE-PNK', 'color' => 'Dusty Pink'],
        ];

        $tshirtSizes = ['S', 'M', 'L', 'XL', 'XXL'];

        foreach ($colors as $i => $row) {
            $product = Product::updateOrCreate(
                ['store_id' => $store->id, 'slug' => $row['slug']],
                [
                    'vendor_id' => $vendor->id,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'product_type' => 'physical',
                    'name' => $row['name'],
                    'short_description' => 'Premium rib-cotton t-shirt in '.$row['color'].'. 23-inch length.',
                    'description' => $description,
                    'price' => 350,
                    'sku' => $row['sku'],
                    'weight_value' => 0.18,
                    'weight_unit' => 'kg',
                    'has_variants' => true,
                    'track_inventory' => true,
                    'stock' => 0,
                    'low_stock_threshold' => 10,
                    'images' => array_filter([$this->img('lifestyle-2'), $this->img('lifestyle-3'), $this->img('lifestyle-5')]),
                    'featured_image' => $this->img('lifestyle-2'),
                    'cover_image' => $this->img('lifestyle-2'),
                    'tags' => ['tshirt', 't-shirt', 'rib-cotton', 'women', $row['color'], 'combo'],
                    'status' => 'active',
                    'is_taxable' => false,
                    'published_at' => now(),
                ],
            );

            foreach ($tshirtSizes as $size) {
                ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => $row['sku'].'-'.$size],
                    [
                        'options' => ['Size' => $size],
                        'price' => 350,
                        'stock' => 30,
                        'is_active' => true,
                    ],
                );
            }
        }
    }

    /* ─────────────── CMS pages ─────────────── */

    protected function seedCmsPages(Store $store): void
    {
        $pages = [
            [
                'slug' => 'about',
                'title' => 'About Wear Impressive',
                'content' => <<<'HTML'
<p>Wear Impressive is a Bangladesh-based fashion brand that started on Facebook four years ago with a simple promise: <strong>impress with every outfit</strong>.</p>

<p>We design and produce women's everyday wear — denim cargos, rib-cotton tees, and the occasional seasonal drop — all made under our own supervision so we never compromise on quality, fabric, or fit.</p>

<h3>What makes us different</h3>
<ul>
  <li><strong>Own supervision</strong> — every stitch passes our QC before it ships</li>
  <li><strong>Premium fabric</strong> — we don't cut corners on material</li>
  <li><strong>Fair pricing</strong> — no reseller markups</li>
  <li><strong>4+ years of customers</strong> who keep coming back</li>
</ul>

<h3>Where we ship</h3>
<p>All over Bangladesh — Dhaka same-day when possible, sub-urban Dhaka in 2 days, and the rest of the country in 3–5 days. Cash on delivery available everywhere.</p>

<p>Questions? WhatsApp us at <a href="https://wa.me/8801993008596">+8801993008596</a>.</p>
HTML,
                'sections' => [
                    'hero' => [
                        'heading' => 'About Wear Impressive',
                        'subheading' => 'We are passionate about bringing you premium everyday fashion made under our own supervision. Four years of happy customers across Bangladesh.',
                    ],
                    'story' => [
                        'heading' => 'Our Story',
                        'paragraphs' => [
                            'Wear Impressive started on Facebook four years ago with one promise — impress with every outfit. What began as a curated collection of women\'s wear has grown into a full fashion brand trusted by thousands of customers across Bangladesh.',
                            'We design and produce denim cargos, rib-cotton tees, and seasonal drops — all made under our own supervision. Every stitch passes our quality check before it ships.',
                            'We work directly with trusted manufacturers across the country, ensuring premium fabrics at fair prices. No reseller markups. No compromises on fit or finish.',
                        ],
                    ],
                    'stats' => [
                        ['value' => '4+', 'label' => 'Years in Business'],
                        ['value' => '5,000+', 'label' => 'Happy Customers'],
                        ['value' => '100%', 'label' => 'Own Supervision'],
                    ],
                    'values' => [
                        [
                            'icon' => 'heart',
                            'title' => 'Quality First',
                            'description' => 'Every product goes through rigorous quality checks. We source only premium fabrics and materials so customers always get the best.',
                            'color' => 'rose',
                        ],
                        [
                            'icon' => 'shield',
                            'title' => 'Trust & Transparency',
                            'description' => 'Honest pricing, genuine products, transparent policies. No hidden charges, no surprises — great fashion at fair prices.',
                            'color' => 'blue',
                        ],
                        [
                            'icon' => 'users',
                            'title' => 'Made in Bangladesh',
                            'description' => 'Produced locally under our own supervision. When you shop with us, you support Bangladeshi craftsmanship and fair wages.',
                            'color' => 'emerald',
                        ],
                    ],
                    'team' => [
                        ['name' => 'Wear Impressive', 'role' => 'Brand', 'initials' => 'WI'],
                    ],
                    'hours' => 'Sat–Thu 10AM–9PM',
                ],
            ],
            [
                'slug' => 'contact',
                'title' => 'Contact Us',
                'content' => <<<'HTML'
<p>We're easiest to reach on WhatsApp.</p>
<ul>
  <li><strong>WhatsApp:</strong> <a href="https://wa.me/8801993008596">+8801993008596</a></li>
  <li><strong>Facebook:</strong> <a href="https://www.facebook.com/wearimpressivee">@wearimpressivee</a></li>
  <li><strong>YouTube:</strong> <a href="https://www.youtube.com/@wearimpressive">@wearimpressive</a></li>
  <li><strong>TikTok:</strong> <a href="https://www.tiktok.com/@wear.impressive">@wear.impressive</a></li>
</ul>
<p>Office hours: 10 AM – 9 PM, 7 days a week.</p>
HTML,
            ],
            [
                'slug' => 'shipping-policy',
                'title' => 'Shipping Policy',
                'content' => <<<'HTML'
<h3>Delivery charges</h3>
<table>
  <tr><th>Zone</th><th>Rate</th><th>Time</th></tr>
  <tr><td>Dhaka City</td><td>70 BDT</td><td>1–2 business days</td></tr>
  <tr><td>Dhaka District (suburban)</td><td>120 BDT</td><td>2–3 business days</td></tr>
  <tr><td>Outside Dhaka</td><td>150 BDT</td><td>3–5 business days</td></tr>
</table>
<h3>Payment</h3>
<p>Cash on Delivery available across all zones. Pay when you receive the parcel and confirm the fit.</p>
HTML,
            ],
            [
                'slug' => 'return-policy',
                'title' => 'Return & Refund Policy',
                'content' => <<<'HTML'
<p>We stand behind every piece we ship. If it doesn't fit or meet your expectations:</p>
<ul>
  <li><strong>Within 3 days of delivery</strong>, you may return the item unused with original tags.</li>
  <li>The customer pays the return delivery fee.</li>
  <li>Once we receive and inspect the item, we'll issue an exchange or refund within 5 business days.</li>
  <li>We do not accept returns on items that show signs of wear, washing, or damage caused by the customer.</li>
</ul>
<p>Open a return by WhatsApp: <a href="https://wa.me/8801993008596">+8801993008596</a>.</p>
HTML,
            ],
            [
                'slug' => 'faq',
                'title' => 'Frequently Asked Questions',
                'content' => <<<'HTML'
<h3>Is the cargo pant really high waist?</h3>
<p>Yes — the waist sits at the navel, giving you a proper high-waist silhouette.</p>

<h3>What fabric is the pant?</h3>
<p>Premium denim / jeans fabric with a soft hand-feel. Not stiff, not flimsy.</p>

<h3>What fabric is the t-shirt?</h3>
<p>Premium rib cotton. The rib texture holds its shape well and breathes in Dhaka's weather.</p>

<h3>How do I measure for the pant size?</h3>
<p>Wrap a measuring tape around your waist at the navel (highest point). That number is your size — 26, 28, 30, and so on. If you're between sizes, size up.</p>

<h3>How long is the t-shirt?</h3>
<p>23 inches from shoulder to hem — hits just below the hip.</p>

<h3>How do I place an order?</h3>
<p>Add items to cart, checkout, pay cash on delivery. Or WhatsApp us directly to order faster.</p>

<h3>Can I return if it doesn't fit?</h3>
<p>Yes — see our Return Policy. You pay the return delivery fee.</p>
HTML,
            ],
            [
                'slug' => 'privacy',
                'title' => 'Privacy Policy',
                'content' => <<<'HTML'
<p>We collect only what we need to fulfil your order: name, phone, delivery address, and optionally email. We never sell your data. We share your delivery details with the courier that ships your parcel. That's it.</p>
<p>You can request deletion of your account any time by WhatsApp.</p>
HTML,
            ],
            [
                'slug' => 'terms',
                'title' => 'Terms of Service',
                'content' => <<<'HTML'
<p>By placing an order with Wear Impressive, you agree to our prices, shipping charges, and return policy as listed on the respective pages. Product images are representative — slight variations in colour may occur due to screen and lighting differences.</p>
<p>We reserve the right to cancel any order we suspect is fraudulent or abusive.</p>
HTML,
            ],
        ];

        foreach ($pages as $p) {
            CmsPage::updateOrCreate(
                ['store_id' => $store->id, 'slug' => $p['slug']],
                [
                    'title' => $p['title'],
                    'content' => $p['content'],
                    'sections' => $p['sections'] ?? null,
                    'url_handle' => $p['slug'],
                    'status' => 'published',
                    'published_at' => now(),
                ],
            );
        }
    }

    /* ─────────────── Nav menus ─────────────── */

    protected function seedNavMenus(Store $store): void
    {
        NavigationMenu::updateOrCreate(
            ['store_id' => $store->id, 'handle' => 'main-menu'],
            [
                'name' => 'Main Menu',
                'items' => [
                    ['label' => 'Home', 'url' => '/store', 'type' => 'link'],
                    ['label' => 'Shop All', 'url' => '/store/products', 'type' => 'link'],
                    ['label' => 'Cargo Pants', 'url' => '/store/products?category=cargo-pants', 'type' => 'link'],
                    ['label' => 'T-Shirts', 'url' => '/store/products?category=t-shirts', 'type' => 'link'],
                    ['label' => 'Combos', 'url' => '/store/products?category=combos', 'type' => 'link'],
                    ['label' => 'About', 'url' => '/store/about', 'type' => 'link'],
                    ['label' => 'Contact', 'url' => '/store/contact', 'type' => 'link'],
                ],
            ],
        );

        NavigationMenu::updateOrCreate(
            ['store_id' => $store->id, 'handle' => 'footer-menu'],
            [
                'name' => 'Footer Menu',
                'items' => [
                    ['label' => 'About', 'url' => '/store/about', 'type' => 'link'],
                    ['label' => 'Shipping Policy', 'url' => '/store/shipping-policy', 'type' => 'link'],
                    ['label' => 'Returns', 'url' => '/store/return-policy', 'type' => 'link'],
                    ['label' => 'FAQ', 'url' => '/store/faq', 'type' => 'link'],
                    ['label' => 'Privacy', 'url' => '/store/privacy', 'type' => 'link'],
                    ['label' => 'Terms', 'url' => '/store/terms', 'type' => 'link'],
                ],
            ],
        );
    }
}
