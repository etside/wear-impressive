'use client';

import { useShopBase } from '@/lib/use-shop-base';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShieldCheck, Users, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storeInfoApi, publicPagesApi } from '@/lib/api/services/storefront';

const ICON_MAP: Record<string, React.ReactNode> = {
  heart: <Heart size={22} />,
  shield: <ShieldCheck size={22} />,
  users: <Users size={22} />,
};

const COLOR_MAP: Record<string, string> = {
  rose: 'bg-rose-50 text-rose-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

const DEFAULT_VALUES = [
  { icon: 'heart', title: 'Quality First', description: 'Every product goes through rigorous quality checks. We source only premium fabrics and materials so customers always get the best.', color: 'rose' },
  { icon: 'shield', title: 'Trust & Transparency', description: 'Honest pricing, genuine products, transparent policies. No hidden charges, no surprises — great fashion at fair prices.', color: 'blue' },
  { icon: 'users', title: 'Made in Bangladesh', description: 'Produced locally under our own supervision. When you shop with us, you support Bangladeshi craftsmanship and fair wages.', color: 'emerald' },
];

const DEFAULT_TEAM = [
  { name: 'Wear Impressive', role: 'Brand', initials: 'WI' },
];

const DEFAULT_STATS = [
  { value: '4+', label: 'Years in Business' },
  { value: '5,000+', label: 'Happy Customers' },
  { value: '100%', label: 'Own Supervision' },
];

export default function AboutPage() {
  const __sb = useShopBase();

  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info'],
    queryFn: () => storeInfoApi.show(),
  });

  const pageQuery = useQuery({
    queryKey: ['storefront', 'cms-page', 'about'],
    queryFn: () => publicPagesApi.get('about'),
    retry: false,
  });

  const store = storeQuery.data;
  const page = pageQuery.data;
  const s = page?.sections ?? {};

  const storeName = store?.name ?? 'Wear Impressive';
  const storeAddress = [store?.address_line_1, store?.thana, store?.district, store?.division]
    .filter(Boolean).join(', ') || 'Uttarkhan, Dhaka, Bangladesh';

  const heroHeading = s.hero?.heading ?? `About ${storeName}`;
  const heroSubheading = s.hero?.subheading ?? 'We are passionate about bringing you premium everyday fashion made under our own supervision.';
  const storyImage = s.story?.story_image ?? null;
  const storyHeading = s.story?.heading ?? 'Our Story';
  const storyParagraphs = s.story?.paragraphs ?? [
    store?.description ?? `Welcome to ${storeName}. We're a small team based in Bangladesh building a modern online retail experience.`,
    'What started as a curated collection has grown into a full fashion brand trusted by thousands of customers across Bangladesh.',
    'We work directly with manufacturers across the country, ensuring premium fabrics at fair prices.',
  ];
  const stats = s.stats ?? DEFAULT_STATS;
  const values = s.values ?? DEFAULT_VALUES;
  const team = s.team ?? DEFAULT_TEAM;
  const hours = s.hours ?? 'Sat–Thu 10AM–9PM';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="container-app pt-8">
        <nav className="flex gap-2 text-xs text-gray-500 mb-8">
          <Link href={__sb} className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <span className="text-gray-900">About Us</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="container-app pb-10">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{heroHeading}</h1>
          <p className="text-gray-500 leading-relaxed">{heroSubheading}</p>
        </div>
      </section>

      {/* Story */}
      <section className="bg-gray-50 border-t border-b border-gray-200 section-md">
        <div className="container-app">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {storyImage ? (
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img src={storyImage} alt="Our Story" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart size={24} className="text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Our Story Image</p>
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{storyHeading}</h2>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                {storyParagraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <div className="flex gap-6 mt-6">
                {stats.map(stat => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-md">
        <div className="container-app">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-2">What We Stand For</h2>
            <p className="text-sm text-gray-500">Our values guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map(v => (
              <div key={v.title} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${COLOR_MAP[v.color] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ICON_MAP[v.icon] ?? <Heart size={22} />}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-gray-50 border-t border-gray-200 section-md">
        <div className="container-app">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Meet Our Team</h2>
            <p className="text-sm text-gray-500">The people behind the brand</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {team.map(member => (
              <div key={member.name} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-gray-500">{member.initials}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">{member.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-md">
        <div className="container-app">
          <div className="bg-black rounded-2xl p-8 sm:p-12 text-center text-white">
            <MapPin size={28} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Visit Our Store</h2>
            <p className="text-sm text-gray-400 mb-1">{storeAddress}</p>
            <p className="text-sm text-gray-400 mb-6">{hours}</p>
            <Link href={`${__sb}/contact`}>
              <Button variant="secondary" size="md">
                Get Directions <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
