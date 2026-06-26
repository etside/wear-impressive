'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useLang } from "@/lib/i18n/context";
import { Pencil, ChevronUp, FileText, Megaphone } from "lucide-react";
import { generalApi, settingsApi, type GeneralSettingsUpdatePayload } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";

const defaultPolicies: Record<string, { title: string; content: string }> = {
  privacy: {
    title: 'Privacy Policy',
    content: `Last updated: April 2026

We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our store.

Information We Collect:
- Personal information you provide (name, email, phone number, shipping address) when placing an order or creating an account.
- Payment information processed securely through our payment partners. We do not store your full payment details.
- Browsing data including pages visited, products viewed, and device information to improve your shopping experience.

How We Use Your Information:
- To process and fulfill your orders.
- To communicate order updates, shipping notifications, and delivery confirmations.
- To send promotional emails (only with your consent; you can unsubscribe at any time).
- To improve our website, products, and customer service.

Data Protection:
- We use industry-standard encryption to protect your data during transmission.
- We do not sell, trade, or share your personal information with third parties except as necessary to fulfill orders (e.g., courier partners).
- You may request access to, correction of, or deletion of your personal data by contacting us.

Contact Us:
If you have questions about this Privacy Policy, please contact us at our store email.`,
  },
  terms: {
    title: 'Terms of Service',
    content: `Last updated: April 2026

Welcome to our store. By accessing or using our website, you agree to be bound by these Terms of Service.

General Terms:
- You must be at least 18 years old or have parental consent to use our services.
- You agree to provide accurate and complete information when creating an account or placing an order.
- We reserve the right to refuse service to anyone for any reason at any time.

Products and Pricing:
- All product descriptions, images, and prices are as accurate as possible, but we do not guarantee they are error-free.
- Prices are listed in Bangladeshi Taka (BDT) unless otherwise stated and are subject to change without notice.
- We reserve the right to limit quantities or cancel orders if pricing errors occur.

Orders and Payments:
- Placing an order constitutes an offer to purchase. We may accept or decline orders at our discretion.
- Payment must be made at the time of order through our accepted payment methods.
- Orders are confirmed only after payment is verified.

Shipping and Delivery:
- We aim to deliver within the estimated timeframe, but delivery dates are not guaranteed.
- Risk of loss transfers to you upon delivery to the courier partner.
- Shipping charges are non-refundable unless the return is due to our error.

Limitation of Liability:
- We are not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.
- Our total liability shall not exceed the amount paid for the specific product in question.

Contact Us:
For questions about these Terms, please contact us at our store email.`,
  },
  refund: {
    title: 'Refund Policy',
    content: `Last updated: April 2026

We want you to be completely satisfied with your purchase. If you are not happy with your order, we are here to help.

Return Eligibility:
- Items must be returned within 7 days of delivery.
- Products must be unused, unworn, and in their original packaging with all tags attached.
- Sale items, undergarments, and customized products are not eligible for returns.
- Items must not be damaged, altered, or washed.

How to Request a Return:
1. Contact our customer service team with your order number and reason for return.
2. We will provide you with return instructions and a return authorization.
3. Ship the item back to us using a trackable shipping method.
4. Once we receive and inspect the item, we will process your refund.

Refund Process:
- Refunds are processed within 5-7 business days after we receive the returned item.
- Refunds will be issued to the original payment method.
- Original shipping charges are non-refundable unless the return is due to a defective or incorrect item.

Exchanges:
- We offer exchanges for different sizes or colors, subject to availability.
- Exchange requests follow the same process as returns.

Damaged or Defective Items:
- If you receive a damaged or defective item, contact us within 48 hours of delivery with photos.
- We will arrange a replacement or full refund at no additional cost to you.

Contact Us:
For return or refund inquiries, please contact our customer service team.`,
  },
};

export default function GeneralSettingsPage() {
  const { t } = useLang();
  const d = t.dashSettings;
  const queryClient = useQueryClient();

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data: store, isLoading } = useQuery({
    queryKey: ['vendor', 'settings', 'general'],
    queryFn: () => generalApi.get(),
  });

  // Form state (editable copy, initially from server)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [language, setLanguage] = useState<'en' | 'bn' | 'both'>('en');
  const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    if (store) {
      setName(store.name ?? '');
      setEmail(store.email ?? '');
      setPhone(store.phone ?? '');
      setDescription(store.description ?? '');
      setAddressLine1(store.address_line_1 ?? '');
      setDivision(store.division ?? 'Dhaka');
      setDistrict(store.district ?? '');
      setCurrency(store.currency ?? 'BDT');
      setTimezone(store.timezone ?? 'Asia/Dhaka');
      setLanguage(store.primary_language ?? 'en');
    }
  }, [store]);

  const updateMutation = useMutation({
    mutationFn: (payload: GeneralSettingsUpdatePayload) => generalApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'general'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info'] });
      showBanner('success', 'Store details saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save store details')),
  });

  const handleSaveGeneral = async () => {
    // Save the canonical store row first…
    updateMutation.mutate({
      name, email, phone: phone || null,
      description: description || null,
      address_line_1: addressLine1 || null,
      division: division || null,
      district: district || null,
      currency, timezone,
      primary_language: language,
    });
    // …then mirror the Bangla description into store settings, since it isn't
    // a column on the stores table. Storefront reads `store.description_bn`
    // when language === 'bn' and falls back to the canonical description.
    try {
      await settingsApi.update({
        settings: [
          { key: 'store.description_bn', value: descriptionBn.trim() || null, group: 'general' },
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
    } catch {
      // Silent — main store update already shows its own banner.
    }
  };

  // Store Policies
  const [policies, setPolicies] = useState(defaultPolicies);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  const policiesMutation = useMutation({
    mutationFn: () => settingsApi.update({
      settings: Object.entries(policies).map(([key, p]) => ({
        key: `policy_${key}`,
        value: { title: p.title, content: p.content },
        group: 'policies',
      })),
    }),
    onSuccess: () => showBanner('success', 'Policies saved'),
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save policies')),
  });

  /* ── Announcement bar ──────────────────────────────────────────── */
  const settingsQuery = useQuery({
    queryKey: ['vendor', 'settings', 'all'],
    queryFn: () => settingsApi.get(),
  });

  const [annEnabled, setAnnEnabled] = useState(true);
  const [annTextEn, setAnnTextEn] = useState('');
  const [annTextBn, setAnnTextBn] = useState('');
  const [annLinkUrl, setAnnLinkUrl] = useState('');
  const [annBgColor, setAnnBgColor] = useState('#000000');
  const [annTextColor, setAnnTextColor] = useState('#ffffff');

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    const en = (s['announcement.enabled'] as unknown);
    setAnnEnabled(en === undefined || en === null ? true : Boolean(en) && en !== '0');
    setDescriptionBn(((s['store.description_bn'] as string) ?? ''));
    setAnnTextEn(((s['announcement.text_en'] as string) ?? ''));
    setAnnTextBn(((s['announcement.text_bn'] as string) ?? ''));
    setAnnLinkUrl(((s['announcement.link_url'] as string) ?? ''));
    setAnnBgColor(((s['announcement.bg_color'] as string) ?? '#000000'));
    setAnnTextColor(((s['announcement.text_color'] as string) ?? '#ffffff'));
  }, [settingsQuery.data]);

  const announcementMutation = useMutation({
    mutationFn: () => settingsApi.update({
      settings: [
        { key: 'announcement.enabled',    value: annEnabled, type: 'boolean', group: 'general' },
        { key: 'announcement.text_en',    value: annTextEn || null,           group: 'general' },
        { key: 'announcement.text_bn',    value: annTextBn || null,           group: 'general' },
        { key: 'announcement.link_url',   value: annLinkUrl || null,          group: 'general' },
        { key: 'announcement.bg_color',   value: annBgColor || null,          group: 'general' },
        { key: 'announcement.text_color', value: annTextColor || null,        group: 'general' },
      ],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
      showBanner('success', 'Announcement bar saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save announcement bar')),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{d.general.storeDetails}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your store details, address, and locale settings</p>
      </div>

      {banner && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      )}

      {/* Store Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{d.general.storeDetails}</h3>
        <div className="flex flex-col gap-4">
          <Input label={d.general.storeName} value={name} onChange={e => setName(e.target.value)} />
          <Input label={d.general.storeEmail} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label={d.general.storePhone} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">{d.general.storeDescription} (English)</label>
            <textarea rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400 text-gray-900"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">{d.general.storeDescription} (বাংলা)</label>
            <textarea rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400 text-gray-900"
              value={descriptionBn} onChange={e => setDescriptionBn(e.target.value)}
              placeholder="বাংলায় আপনার দোকানের সংক্ষিপ্ত বিবরণ..." />
            <p className="text-[11px] text-gray-400 mt-1">Leave blank to fall back to the English version for Bangla viewers.</p>
          </div>
        </div>
      </div>

      {/* Store Address */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{d.general.address}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label={d.general.addressLine} placeholder="House #, Road #, Area" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} /></div>
          <SearchableSelect
            label={d.general.division}
            options={['Dhaka','Chattogram','Sylhet','Rajshahi','Khulna','Barishal','Mymensingh','Rangpur'].map(v => ({ value: v, label: v }))}
            value={division} onChange={v => setDivision(v)}
          />
          <Input label={d.general.district} placeholder="e.g. Dhaka" value={district} onChange={e => setDistrict(e.target.value)} />
        </div>
      </div>

      {/* Currency & Locale */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{d.general.locale}</h3>
        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect label={d.general.currency} searchable={false}
            options={[{ value: 'BDT', label: '৳ BDT — Bangladeshi Taka' }, { value: 'USD', label: '$ USD — US Dollar' }]}
            value={currency} onChange={v => setCurrency(v)} />
          <SearchableSelect label={d.general.timezone} searchable={false}
            options={[{ value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' }]}
            value={timezone} onChange={v => setTimezone(v)} />
          <SearchableSelect label={d.general.language} searchable={false}
            options={[{ value: 'en', label: 'English' }, { value: 'bn', label: 'বাংলা' }, { value: 'both', label: 'Both' }]}
            value={language} onChange={v => setLanguage(v as 'en' | 'bn' | 'both')} />
          <SearchableSelect label={d.general.weightUnit} searchable={false}
            options={[{ value: 'kg', label: 'Kilogram (kg)' }, { value: 'g', label: 'Gram (g)' }, { value: 'lb', label: 'Pound (lb)' }]}
            value={weightUnit} onChange={v => setWeightUnit(v)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveGeneral} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : d.save}
        </Button>
      </div>

      {/* Announcement Bar */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-gray-900">Announcement Bar</h2>
        <p className="text-sm text-gray-500 mt-0.5">A short notice shown at the very top of every storefront page.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Show announcement bar</p>
              <p className="text-xs text-gray-500">Toggle off to hide the banner from your storefront.</p>
            </div>
          </div>
          <ToggleSwitch checked={annEnabled} onChange={setAnnEnabled} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Text (English)</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400 text-gray-900"
              value={annTextEn}
              onChange={(e) => setAnnTextEn(e.target.value)}
              placeholder="Free delivery on orders over ৳999 — code FREESHIP"
              maxLength={200}
            />
            <p className="text-[11px] text-gray-400 mt-1">{annTextEn.length}/200</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Text (বাংলা)</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400 text-gray-900"
              value={annTextBn}
              onChange={(e) => setAnnTextBn(e.target.value)}
              placeholder="৳৯৯৯-এর উপরে অর্ডারে বিনামূল্যে ডেলিভারি"
              maxLength={200}
            />
            <p className="text-[11px] text-gray-400 mt-1">{annTextBn.length}/200</p>
          </div>
        </div>

        <Input
          label="Link URL (optional)"
          placeholder="/products or https://example.com/sale"
          value={annLinkUrl}
          onChange={(e) => setAnnLinkUrl(e.target.value)}
          hint="Make the whole banner a clickable link to a category, page, or external URL."
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Background color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={annBgColor}
                onChange={(e) => setAnnBgColor(e.target.value)}
                className="h-10 w-12 border border-gray-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={annBgColor}
                onChange={(e) => setAnnBgColor(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-900 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Text color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={annTextColor}
                onChange={(e) => setAnnTextColor(e.target.value)}
                className="h-10 w-12 border border-gray-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={annTextColor}
                onChange={(e) => setAnnTextColor(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Live preview — mirrors the storefront markup so vendors can see
            colour + text contrast before saving. */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Preview</label>
          <div
            className="rounded-lg overflow-hidden border border-gray-200"
            style={{ backgroundColor: annEnabled ? annBgColor : '#f3f4f6' }}
          >
            <div
              className="min-h-9 flex items-center justify-center px-4 py-2 text-xs text-center"
              style={{ color: annEnabled ? annTextColor : '#9ca3af' }}
            >
              {!annEnabled
                ? 'Banner is hidden.'
                : (annTextEn || annTextBn || 'Your announcement will appear here.')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => announcementMutation.mutate()}
          disabled={announcementMutation.isPending}
        >
          {announcementMutation.isPending ? 'Saving...' : 'Save Announcement Bar'}
        </Button>
      </div>

      {/* Store Policies Section */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-gray-900">Store Policies</h2>
        <p className="text-sm text-gray-500 mt-0.5">These policies will appear in your storefront footer</p>
      </div>

      <div className="space-y-3">
        {Object.entries(policies).map(([key, policy]) => {
          const isExpanded = expandedPolicy === key;
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{policy.title}</p>
                    <p className="text-xs text-gray-500">{policy.content.length > 0 ? `${policy.content.split('\n').length} lines` : 'Not set'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedPolicy(isExpanded ? null : key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </>
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <textarea
                    value={policy.content}
                    onChange={e => setPolicies(prev => ({ ...prev, [key]: { ...prev[key], content: e.target.value } }))}
                    rows={16}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-y focus:border-gray-400 text-gray-900 leading-relaxed"
                    placeholder={`Enter your ${policy.title.toLowerCase()} here...`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => policiesMutation.mutate()} disabled={policiesMutation.isPending}>
          {policiesMutation.isPending ? 'Saving...' : d.save}
        </Button>
      </div>
    </div>
  );
}
