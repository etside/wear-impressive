<?php

namespace Database\Seeders;

use App\Models\CmsPage;
use App\Models\Store;
use Illuminate\Database\Seeder;

/**
 * Idempotent seeder — safe to run on live. Only touches cms_pages rows.
 * updateOrCreate keyed on (store_id, slug) so existing content is preserved
 * unless explicitly overwritten here.
 */
class CmsPagesSeeder extends Seeder
{
    public function run(): void
    {
        $store = Store::where('handle', 'wi')->firstOrFail();

        $pages = [
            [
                'slug'    => 'about',
                'title'   => 'About Wear Impressive',
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
                    'hero'   => [
                        'heading'    => 'About Wear Impressive',
                        'subheading' => 'We are passionate about bringing you premium everyday fashion made under our own supervision. Four years of happy customers across Bangladesh.',
                    ],
                    'story'  => [
                        'heading'    => 'Our Story',
                        'paragraphs' => [
                            'Wear Impressive started on Facebook four years ago with one promise — impress with every outfit. What began as a curated collection of women\'s wear has grown into a full fashion brand trusted by thousands of customers across Bangladesh.',
                            'We design and produce denim cargos, rib-cotton tees, and seasonal drops — all made under our own supervision. Every stitch passes our quality check before it ships.',
                            'We work directly with trusted manufacturers across the country, ensuring premium fabrics at fair prices. No reseller markups. No compromises on fit or finish.',
                        ],
                    ],
                    'stats'  => [
                        ['value' => '4+',     'label' => 'Years in Business'],
                        ['value' => '5,000+', 'label' => 'Happy Customers'],
                        ['value' => '100%',   'label' => 'Own Supervision'],
                    ],
                    'values' => [
                        ['icon' => 'heart',  'title' => 'Quality First',        'description' => 'Every product goes through rigorous quality checks. We source only premium fabrics and materials so customers always get the best.',                   'color' => 'rose'],
                        ['icon' => 'shield', 'title' => 'Trust & Transparency', 'description' => 'Honest pricing, genuine products, transparent policies. No hidden charges, no surprises — great fashion at fair prices.',                          'color' => 'blue'],
                        ['icon' => 'users',  'title' => 'Made in Bangladesh',   'description' => 'Produced locally under our own supervision. When you shop with us, you support Bangladeshi craftsmanship and fair wages.', 'color' => 'emerald'],
                    ],
                    'team'   => [
                        ['name' => 'Wear Impressive', 'role' => 'Brand', 'initials' => 'WI'],
                    ],
                    'hours'  => 'Sat–Thu 10AM–9PM',
                ],
            ],
            [
                'slug'    => 'contact',
                'title'   => 'Contact Us',
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
                'slug'    => 'shipping-policy',
                'title'   => 'Shipping Policy',
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
                'slug'    => 'return-policy',
                'title'   => 'Return & Refund Policy',
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
                'slug'    => 'faq',
                'title'   => 'Frequently Asked Questions',
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
                'slug'    => 'privacy',
                'title'   => 'Privacy Policy',
                'content' => <<<'HTML'
<p>We collect only what we need to fulfil your order: name, phone, delivery address, and optionally email. We never sell your data. We share your delivery details with the courier that ships your parcel. That's it.</p>
<p>You can request deletion of your account any time by WhatsApp.</p>
HTML,
            ],
            [
                'slug'    => 'terms',
                'title'   => 'Terms of Service',
                'content' => <<<'HTML'
<p>By placing an order with Wear Impressive, you agree to our prices, shipping charges, and return policy as listed on the respective pages. Product images are representative — slight variations in colour may occur due to screen and lighting differences.</p>
<p>We reserve the right to cancel any order we suspect is fraudulent or abusive.</p>
HTML,
            ],
        ];

        foreach ($pages as $p) {
            $existing = CmsPage::where('store_id', $store->id)
                ->where('slug', $p['slug'])
                ->first();

            $data = [
                'title'      => $p['title'],
                'content'    => $p['content'],
                'url_handle' => $p['slug'],
                'status'     => 'published',
                'published_at' => now(),
            ];

            // Only set sections if not already customised on live
            // (story_image set by vendor = live customisation, don't overwrite)
            if (isset($p['sections'])) {
                if ($existing && $existing->sections) {
                    // Merge: preserve any vendor-set keys (e.g. story_image)
                    $merged = array_replace_recursive($p['sections'], $existing->sections);
                    $data['sections'] = $merged;
                } else {
                    $data['sections'] = $p['sections'];
                }
            }

            CmsPage::updateOrCreate(
                ['store_id' => $store->id, 'slug' => $p['slug']],
                $data,
            );
        }

        $this->command?->info('CMS pages seeded for store: '.$store->handle);
    }
}
