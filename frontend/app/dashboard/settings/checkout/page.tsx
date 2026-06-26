'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { checkoutFieldsApi, settingsApi } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { CheckoutField } from "@/lib/api/types";

interface CustomField {
  id: string;
  label: string;
  type: string;
  options: string;
  placeholder: string;
  required: boolean;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'attachment', label: 'Attachment' },
];

const REQUIREMENT_OPTIONS = [
  { value: 'hidden', label: "Don't include" },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

export default function CheckoutSettingsPage() {
  const { t } = useLang();
  const d = t.dashSettings;
  const c = d.checkout;
  const queryClient = useQueryClient();

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  // -- Contact method --
  const [contactMethod, setContactMethod] = useState<'phoneOrEmail' | 'emailOnly'>('phoneOrEmail');
  const [showTracking, setShowTracking] = useState(true);
  const [requireSignIn, setRequireSignIn] = useState(false);

  // -- Customer information fields (hydrated from API) --
  // Keys match backend CheckoutFieldSetting.field_key values exactly.
  const [fieldRequirements, setFieldRequirements] = useState<Record<string, 'required' | 'optional' | 'hidden'>>({
    first_name: 'required',
    last_name: 'required',
    email: 'optional',
    phone: 'required',
    division: 'required',
    district: 'required',
    area: 'optional',
    address_line_1: 'required',
    address_line_2: 'hidden',
    postal_code: 'hidden',
    notes: 'optional',
  });

  // Load fields from API
  const { data: apiFields } = useQuery({
    queryKey: ['vendor', 'settings', 'checkout-fields'],
    queryFn: () => checkoutFieldsApi.list(),
  });

  useEffect(() => {
    if (!apiFields) return;
    const mapped: Record<string, 'required' | 'optional' | 'hidden'> = { ...fieldRequirements };
    apiFields.forEach(f => {
      // Backend returns a `requirement` enum ('required'|'optional'|'hidden').
      // Fall back to visible/required booleans for forward-compat.
      const fRec = f as unknown as { requirement?: 'required' | 'optional' | 'hidden' };
      const req: 'required' | 'optional' | 'hidden' = fRec.requirement
        ?? (!f.visible ? 'hidden' : f.required ? 'required' : 'optional');
      if (f.field_key in mapped) mapped[f.field_key] = req;
    });
    setFieldRequirements(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFields]);

  const saveFieldsMutation = useMutation({
    mutationFn: () => {
      // Merge UI state with existing field records from API, sending the
      // `requirement` enum the backend actually validates.
      const existingByKey = new Map<string, CheckoutField>();
      (apiFields ?? []).forEach(f => existingByKey.set(f.field_key, f));

      const fields: Array<Partial<CheckoutField> & { requirement: string }> = Object.entries(fieldRequirements).map(([key, req], idx) => {
        const existing = existingByKey.get(key);
        return {
          ...(existing ? { id: existing.id } : {}),
          field_key: key,
          label: existing?.label ?? key,
          type: existing?.type ?? 'text',
          required: req === 'required',
          visible: req !== 'hidden',
          requirement: req,
          sort_order: existing?.sort_order ?? idx,
        };
      });
      return checkoutFieldsApi.update({ fields });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'checkout-fields'] });
      showBanner('success', 'Checkout fields saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save checkout fields')),
  });

  // -- Custom fields --
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldForm, setFieldForm] = useState<CustomField>({
    id: '', label: '', type: 'text', options: '', placeholder: '', required: false,
  });

  // -- Marketing --
  const [emailMarketing, setEmailMarketing] = useState(true);
  const [smsMarketing, setSmsMarketing] = useState(false);

  // -- Tipping --
  const [tippingEnabled, setTippingEnabled] = useState(false);
  const [tipPresets, setTipPresets] = useState(['5', '10', '15']);
  const [allowCustomTip, setAllowCustomTip] = useState(true);

  // -- Advanced --
  const [enableCartLimit, setEnableCartLimit] = useState(false);

  const updateFieldReq = (field: string, value: string) => {
    setFieldRequirements(prev => ({ ...prev, [field]: value as 'required' | 'optional' | 'hidden' }));
  };

  const openNewField = () => {
    setFieldForm({ id: '', label: '', type: 'text', options: '', placeholder: '', required: false });
    setEditingField(null);
    setShowFieldForm(true);
  };

  const openEditField = (f: CustomField) => {
    setFieldForm({ ...f });
    setEditingField(f);
    setShowFieldForm(true);
  };

  const saveField = () => {
    if (!fieldForm.label.trim()) return;
    if (editingField) {
      setCustomFields(prev => prev.map(f => f.id === editingField.id ? { ...fieldForm, id: editingField.id } : f));
    } else {
      setCustomFields(prev => [...prev, { ...fieldForm, id: crypto.randomUUID() }]);
    }
    setShowFieldForm(false);
    setEditingField(null);
  };

  const deleteField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const hasOptions = fieldForm.type === 'dropdown' || fieldForm.type === 'radio';

  const CUSTOMER_INFO_FIELDS = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone number' },
    { key: 'division', label: 'Division' },
    { key: 'district', label: 'District' },
    { key: 'area', label: 'Area / Upazila / Thana' },
    { key: 'address_line_1', label: 'Address line 1' },
    { key: 'address_line_2', label: 'Address line 2 (apartment, unit, etc.)' },
    { key: 'postal_code', label: 'Postal code' },
    { key: 'notes', label: 'Order notes' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Checkout</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure how customers complete their purchase</p>
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

      {/* ── Customer Contact Method ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{c.contactMethod}</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="contactMethod"
              checked={contactMethod === 'phoneOrEmail'}
              onChange={() => setContactMethod('phoneOrEmail')}
              className="mt-0.5 accent-black"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{c.phoneOrEmail}</p>
              <p className="text-xs text-gray-500">{c.phoneOrEmailNote}</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="contactMethod"
              checked={contactMethod === 'emailOnly'}
              onChange={() => setContactMethod('emailOnly')}
              className="mt-0.5 accent-black"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{c.emailOnly}</p>
            </div>
          </label>
          <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTracking}
                onChange={() => setShowTracking(!showTracking)}
                className="mt-0.5 accent-black"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{c.showTracking}</p>
                <p className="text-xs text-gray-500">{c.showTrackingNote}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireSignIn}
                onChange={() => setRequireSignIn(!requireSignIn)}
                className="mt-0.5 accent-black"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{c.requireSignIn}</p>
                <p className="text-xs text-gray-500">{c.requireSignInNote}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Name entry style ── */}
      <NameModePanel />

      {/* ── Customer Information Fields ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{c.customerInfo}</h3>
        <div className="flex flex-col gap-3">
          {CUSTOMER_INFO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="w-44">
                <SearchableSelect
                  options={REQUIREMENT_OPTIONS}
                  value={fieldRequirements[key]}
                  onChange={(val) => updateFieldReq(key, val)}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom Fields (Metafields) ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{c.customFields}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{c.customFieldsDesc}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={openNewField}><Plus size={14} /> {c.addCustomField}</Button>
        </div>

        {customFields.length === 0 && !showFieldForm && (
          <p className="text-sm text-gray-400 text-center py-6">{c.noCustomFields}</p>
        )}

        {customFields.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {customFields.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <GripVertical size={14} className="text-gray-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.label}</p>
                    <p className="text-xs text-gray-500">
                      {FIELD_TYPE_OPTIONS.find(o => o.value === f.type)?.label || f.type}
                      {f.required ? ' · Required' : ' · Optional'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEditField(f)}><Pencil size={13} /></Button>
                  <Button variant="ghost" size="xs" className="text-red-500" onClick={() => deleteField(f.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showFieldForm && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4">
            <Input
              label={c.fieldLabel}
              placeholder={c.fieldLabelPlaceholder}
              value={fieldForm.label}
              onChange={(e) => setFieldForm(prev => ({ ...prev, label: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">{c.fieldType}</label>
              <SearchableSelect
                options={FIELD_TYPE_OPTIONS}
                value={fieldForm.type}
                onChange={(val) => setFieldForm(prev => ({ ...prev, type: val }))}
              />
            </div>
            {hasOptions && (
              <Input
                label={c.fieldOptions}
                placeholder={c.fieldOptionsPlaceholder}
                value={fieldForm.options}
                onChange={(e) => setFieldForm(prev => ({ ...prev, options: e.target.value }))}
              />
            )}
            <Input
              label={c.placeholderText}
              placeholder={c.placeholderHint}
              value={fieldForm.placeholder}
              onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToggleSwitch checked={fieldForm.required} onChange={(v) => setFieldForm(prev => ({ ...prev, required: v }))} />
                <span className="text-sm text-gray-700">{c.required}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowFieldForm(false); setEditingField(null); }}>{c.cancel}</Button>
                <Button size="sm" onClick={saveField}>{editingField ? c.updateField : c.saveField}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Marketing Options ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.marketingOptions}</h3>
        <p className="text-xs text-gray-500 mb-4">{c.marketingDesc}</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{c.emailMarketingLabel}</span>
            <ToggleSwitch checked={emailMarketing} onChange={setEmailMarketing} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{c.smsMarketingLabel}</span>
            <ToggleSwitch checked={smsMarketing} onChange={setSmsMarketing} />
          </div>
        </div>
      </div>

      {/* ── Tipping ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.tipping}</h3>
        <p className="text-xs text-gray-500 mb-4">{c.tippingDesc}</p>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tippingEnabled}
              onChange={() => setTippingEnabled(!tippingEnabled)}
              className="accent-black"
            />
            <span className="text-sm font-medium text-gray-900">{c.showTipping}</span>
          </label>
          {tippingEnabled && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {tipPresets.map((val, i) => (
                  <div key={i}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{c.preset} {i + 1}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const next = [...tipPresets];
                          next[i] = e.target.value;
                          setTipPresets(next);
                        }}
                        className="w-full h-9 px-3 pr-7 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCustomTip}
                  onChange={() => setAllowCustomTip(!allowCustomTip)}
                  className="accent-black"
                />
                <span className="text-sm text-gray-700">{c.allowCustomAmount}</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* ── Checkout Language ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.checkoutLanguage}</h3>
        <p className="text-xs text-gray-500 mb-4">{c.currentLanguages}</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">English</span>
              <span className="text-xs text-gray-400">Default</span>
            </div>
            <Button variant="ghost" size="xs">{c.editCheckoutContent}</Button>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">বাংলা</span>
            </div>
            <Button variant="ghost" size="xs">{c.editCheckoutContent}</Button>
          </div>
        </div>
      </div>

      {/* ── Advanced Preferences ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{c.advancedPreferences}</h3>
        <div className="flex flex-col gap-5">
          {/* Address collection */}
          <div>
            <p className="text-sm font-medium text-gray-900">{c.addressCollection}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.addressCollectionDesc}</p>
            <p className="text-xs text-gray-400 mt-1">{c.addressCollectionInfo}</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.addToCartLimit}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.addToCartLimitDesc}</p>
              </div>
              <ToggleSwitch checked={enableCartLimit} onChange={setEnableCartLimit} />
            </div>
            {enableCartLimit && (
              <p className="text-xs text-gray-400 mt-2">{c.cartLimitInfo}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveFieldsMutation.mutate()} disabled={saveFieldsMutation.isPending}>
          {saveFieldsMutation.isPending ? 'Saving...' : d.save}
        </Button>
      </div>
    </div>
  );
}

/* ── Name-entry mode selector ─────────────────────────────────────── */
function NameModePanel() {
  const qc = useQueryClient();
  const [banner, setBanner] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['vendor', 'settings', 'all'],
    queryFn: () => settingsApi.get(),
  });

  const currentMode = (() => {
    const val = settingsQuery.data?.['checkout.name_mode'];
    return val === 'full' ? 'full' : 'split';
  })();

  const updateMut = useMutation({
    mutationFn: (mode: 'split' | 'full') => settingsApi.update({
      settings: [{ key: 'checkout.name_mode', value: mode, group: 'checkout' }],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      qc.invalidateQueries({ queryKey: ['storefront', 'checkout-fields'] });
      setBanner('Saved.');
      setTimeout(() => setBanner(null), 2500);
    },
    onError: (err) => setBanner(getApiErrorMessage(err, 'Failed to save.')),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Name entry style</h3>
          <p className="text-xs text-gray-500 mt-0.5">How customers enter their name at checkout.</p>
        </div>
        {banner && <span className="text-xs text-green-600">{banner}</span>}
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="name-mode"
            className="mt-0.5 accent-black"
            checked={currentMode === 'split'}
            onChange={() => updateMut.mutate('split')}
            disabled={updateMut.isPending}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">First name &amp; Last name (split)</p>
            <p className="text-xs text-gray-500">Two separate inputs. Useful for personalised emails (&quot;Hi Rashida&quot;).</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="name-mode"
            className="mt-0.5 accent-black"
            checked={currentMode === 'full'}
            onChange={() => updateMut.mutate('full')}
            disabled={updateMut.isPending}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Full name (single field)</p>
            <p className="text-xs text-gray-500">One input. Faster for customers who don&apos;t want hassle.</p>
          </div>
        </label>
      </div>
    </div>
  );
}

