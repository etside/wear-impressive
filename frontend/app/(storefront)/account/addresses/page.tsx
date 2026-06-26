'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useLang } from '@/lib/i18n/context';
import {
  getSortedDistricts,
  getThanasWithAreas,
  getAreasForThana,
  getPostalCodeForArea,
} from '@/lib/bangladesh-locations';
import { addressesApi, type AddressCreatePayload } from '@/lib/api/services/customer';
import { publicCheckoutFieldsApi, type PublicCheckoutField } from '@/lib/api/services/storefront';
import { getApiErrorMessage } from '@/lib/api/client';
import type { CustomerAddress } from '@/lib/api/types';

const EMPTY: AddressCreatePayload = {
  // Backend validates label as one of `home|office|other` (lowercase). The
  // dropdown stores the lowercase enum value; the visible text is localised.
  label: 'home',
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  // Division is intentionally not collected by default — every district maps
  // to exactly one division. We keep the field on the payload so saved
  // addresses round-trip the legacy meaning unchanged.
  division: '',
  district: '',
  thana: '',
  area: '',
  postal_code: '',
  is_default: false,
};

/**
 * Built-in defaults for the customer's address form. The vendor's
 * checkout-fields config (publicCheckoutFieldsApi.config) overrides any of
 * these — turning a field off there hides it here too. When the vendor
 * hasn't saved a config at all (fresh store), we fall back to district +
 * thana + address_line_1 (the most common BD-shipping shape).
 */
const DEFAULTS: Record<string, { visible: boolean; required: boolean }> = {
  full_name: { visible: true, required: true },
  phone: { visible: true, required: true },
  district: { visible: true, required: true },
  thana: { visible: true, required: false },
  area: { visible: false, required: false },
  address_line_1: { visible: true, required: true },
  address_line_2: { visible: false, required: false },
  postal_code: { visible: false, required: false },
};

export default function AccountAddressesPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const a = t.accountAddresses;
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AddressCreatePayload>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const addressesQuery = useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: () => addressesApi.list(),
  });

  // Single source of truth — same config the checkout uses, so a customer
  // editing their address sees exactly the fields the vendor wants captured
  // at order time. No vendor-side toggling needed in two places.
  const fieldsQuery = useQuery({
    queryKey: ['storefront', 'checkout-fields'],
    queryFn: () => publicCheckoutFieldsApi.config(),
    staleTime: 60_000,
  });

  const fieldByKey = useMemo(() => {
    const out: Record<string, PublicCheckoutField> = {};
    (fieldsQuery.data?.fields ?? []).forEach((f) => { out[f.field_key] = f; });
    return out;
  }, [fieldsQuery.data]);

  /**
   * Resolves visibility + required flag for an address field. The storefront
   * `/store/checkout-fields` endpoint filters out `requirement: hidden` rows
   * server-side, so a missing key in the response means either:
   *   - the vendor saved a config and explicitly disabled this field, OR
   *   - the vendor hasn't saved any config yet (fresh store).
   *
   * We tell the two cases apart by whether `fieldsQuery.data` resolved at
   * all. If the vendor has *any* saved config we treat unknown keys as
   * hidden — matches the checkout page's pattern so addresses + checkout
   * show the same fields. For brand-new stores we fall back to the
   * DEFAULTS table.
   */
  const hasVendorConfig = (fieldsQuery.data?.fields?.length ?? 0) > 0;

  /**
   * Resolves the visibility + required flag + label for an address field.
   *
   * For built-in fields the vendor's saved label is single-language English,
   * so we prefer the bilingual i18n fallback to keep BN customers seeing
   * Bangla labels. Custom vendor-added fields (`is_custom: true`) still use
   * the vendor's exact label since we have no translation for them.
   */
  const cfg = (key: string, fallbackLabel: string, fallbackPlaceholder = '') => {
    const fc = fieldByKey[key];
    if (fc) {
      const useVendorLabel = !!fc.is_custom;
      return {
        visible: true,
        required: fc.requirement === 'required',
        label: useVendorLabel ? (fc.label ?? fallbackLabel) : fallbackLabel,
        placeholder: useVendorLabel ? (fc.placeholder ?? fallbackPlaceholder) : fallbackPlaceholder,
      };
    }
    if (hasVendorConfig) {
      // Vendor has a config but didn't enable this key — they want it
      // hidden, even if it's in our DEFAULTS table.
      return { visible: false, required: false, label: fallbackLabel, placeholder: fallbackPlaceholder };
    }
    const d = DEFAULTS[key];
    if (d) return { ...d, label: fallbackLabel, placeholder: fallbackPlaceholder };
    return { visible: false, required: false, label: fallbackLabel, placeholder: fallbackPlaceholder };
  };

  // i18n fallbacks come from t.checkout.form so addresses + checkout share
  // the same translations and stay in sync as new locales are added.
  const f = t.checkout.form;
  // The address schema stores `full_name` as a single column, but vendors
  // may have configured the *checkout* form with split first/last names
  // (or just first_name like WI). Treat any of those as a signal to render
  // a single Full Name input. It's required if either part is required.
  const rawFullName = cfg('full_name', f.fullName, f.fullNamePlaceholder);
  const rawFirst = cfg('first_name', f.firstName, f.firstNamePlaceholder);
  const rawLast = cfg('last_name', f.lastName, f.lastNamePlaceholder);
  const fullNameCfg = {
    visible: rawFullName.visible || rawFirst.visible || rawLast.visible,
    required: rawFullName.required || rawFirst.required || rawLast.required,
    label: f.fullName,
    placeholder: f.fullNamePlaceholder,
  };
  const phoneCfg = cfg('phone', f.phone, f.phonePlaceholder);
  const districtCfg = cfg('district', f.district, f.districtPlaceholder);
  const thanaCfg = cfg('thana', 'Thana');
  const areaCfg = cfg('area', f.area, f.areaPlaceholder);
  const addressCfg = cfg('address_line_1', f.addressLine, f.addressLinePlaceholder);
  const address2Cfg = cfg('address_line_2', 'Address line 2');
  const postalCfg = cfg('postal_code', 'Postal code', '1207');

  const createMutation = useMutation({
    mutationFn: (data: AddressCreatePayload) => addressesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', 'addresses'] });
      closeForm();
    },
    onError: (err) => setError(getApiErrorMessage(err, a.saveError)),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: AddressCreatePayload }) =>
      addressesApi.update(vars.id, vars.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', 'addresses'] });
      closeForm();
    },
    onError: (err) => setError(getApiErrorMessage(err, a.saveError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => addressesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', 'addresses'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => addressesApi.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', 'addresses'] }),
  });

  const addresses = addressesQuery.data ?? [];

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setCreating(true);
    setError(null);
  }

  function startEdit(addr: CustomerAddress) {
    setCreating(false);
    setEditing(addr);
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 ?? '',
      division: addr.division,
      district: addr.district,
      thana: addr.thana,
      area: addr.area ?? '',
      postal_code: addr.postal_code ?? '',
      is_default: addr.is_default,
    });
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
    setError(null);
  }

  function submit() {
    setError(null);
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  }

  const showForm = creating || editing;
  const saving = createMutation.isPending || updateMutation.isPending;

  // Districts are constant; thanas + areas reset whenever district/thana
  // changes. Memoised so the dropdowns don't rebuild on every keystroke.
  const districtOptions = useMemo(
    () => getSortedDistricts().map((d) => ({ value: d, label: d })),
    [],
  );
  const thanaOptions = useMemo(
    () => getThanasWithAreas(form.district).map((tn) => ({ value: tn, label: tn })),
    [form.district],
  );
  const areaList = useMemo(
    () => getAreasForThana(form.district, form.thana),
    [form.district, form.thana],
  );
  const areaOptions = useMemo(
    () => areaList.map((ar) => ({ value: ar.name, label: `${ar.name} · ${ar.postal_code}` })),
    [areaList],
  );

  const labelOptions = useMemo(
    () => [
      { value: 'home', label: a.labelHome },
      { value: 'office', label: a.labelOffice },
      { value: 'other', label: a.labelOther },
    ],
    [a],
  );

  const onDistrictChange = (next: string) => {
    setForm({ ...form, district: next, thana: '', area: '', postal_code: '' });
  };
  const onThanaChange = (next: string) => {
    setForm({ ...form, thana: next, area: '', postal_code: '' });
  };
  const onAreaChange = (next: string) => {
    const postal = getPostalCodeForArea(form.district, form.thana, next) ?? form.postal_code ?? '';
    setForm({ ...form, area: next, postal_code: postal });
  };

  const suffix = (req: boolean) => (req ? ' *' : '');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">{a.heading}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{addresses.length} {a.countSuffix}</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={startCreate}>
            <Plus size={14} /> {a.addBtn}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editing ? a.editTitle : a.newTitle}
            </h3>
            <button
              onClick={closeForm}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Label — preset dropdown so saved addresses are easy to scan
                ("Home" / "Office" / "Other"). The vendor never configures
                this; it's a customer-organising convenience only. */}
            <div>
              <SearchableSelect
                label={a.labelField}
                options={labelOptions}
                value={(form.label || 'home').toLowerCase()}
                onChange={(v) => setForm({ ...form, label: v })}
                searchable={false}
              />
            </div>

            {fullNameCfg.visible && (
              <Input
                label={fullNameCfg.label + suffix(fullNameCfg.required)}
                placeholder={fullNameCfg.placeholder}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            )}

            {phoneCfg.visible && (
              <Input
                label={phoneCfg.label + suffix(phoneCfg.required)}
                placeholder={phoneCfg.placeholder}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            )}

            {/* District — only renders when the vendor has it enabled. */}
            {districtCfg.visible && (
              <div>
                <SearchableSelect
                  label={districtCfg.label + suffix(districtCfg.required)}
                  placeholder={districtCfg.placeholder}
                  options={districtOptions}
                  value={form.district || null}
                  onChange={(v) => onDistrictChange(v)}
                />
              </div>
            )}

            {/* Thana — gated by the same `thana` config key as the checkout. */}
            {thanaCfg.visible && (
              <div>
                <SearchableSelect
                  label={thanaCfg.label + suffix(thanaCfg.required)}
                  placeholder={form.district ? 'Select thana' : 'Pick a district first'}
                  options={thanaOptions}
                  value={form.thana || null}
                  onChange={(v) => onThanaChange(v)}
                  disabled={!form.district}
                />
              </div>
            )}

            {/* Area — optional sub-area within a thana. Falls back to free
                text for thanas with no mapped area dataset (rural). */}
            {areaCfg.visible && (
              areaOptions.length > 0 ? (
                <div className="sm:col-span-2">
                  <SearchableSelect
                    label={areaCfg.label + suffix(areaCfg.required)}
                    placeholder={form.thana ? 'Select area' : 'Pick a thana first'}
                    options={areaOptions}
                    value={form.area || null}
                    onChange={(v) => onAreaChange(v)}
                    disabled={!form.thana}
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <Input
                    label={areaCfg.label + suffix(areaCfg.required)}
                    placeholder={areaCfg.placeholder}
                    value={form.area ?? ''}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>
              )
            )}

            {addressCfg.visible && (
              <div className="sm:col-span-2">
                <Input
                  label={addressCfg.label + suffix(addressCfg.required)}
                  placeholder={addressCfg.placeholder}
                  value={form.address_line_1}
                  onChange={(e) => setForm({ ...form, address_line_1: e.target.value })}
                />
              </div>
            )}

            {address2Cfg.visible && (
              <div className="sm:col-span-2">
                <Input
                  label={address2Cfg.label + suffix(address2Cfg.required)}
                  placeholder={address2Cfg.placeholder}
                  value={form.address_line_2 ?? ''}
                  onChange={(e) => setForm({ ...form, address_line_2: e.target.value })}
                />
              </div>
            )}

            {postalCfg.visible && (
              <Input
                label={postalCfg.label + suffix(postalCfg.required)}
                placeholder={postalCfg.placeholder}
                value={form.postal_code ?? ''}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                hint={form.area ? 'Auto-filled from area — edit if needed' : undefined}
              />
            )}
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            <span className="text-sm text-gray-700">{a.setDefault}</span>
          </label>

          <div className="flex gap-2 mt-5">
            <Button onClick={submit} loading={saving} disabled={saving}>
              {editing ? a.saveChanges : a.addBtn}
            </Button>
            <Button variant="ghost" onClick={closeForm} disabled={saving}>{a.cancel}</Button>
          </div>
        </div>
      )}

      {addressesQuery.isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center text-sm text-gray-400">
          {a.loading}
        </div>
      ) : addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const k = (addr.label ?? '').toLowerCase();
                      if (k === 'home') return a.labelHome;
                      if (k === 'office') return a.labelOffice;
                      if (k === 'other') return a.labelOther;
                      return addr.label;
                    })()}
                  </span>
                  {addr.is_default && (
                    <span className="text-[10px] uppercase tracking-wide font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      {a.defaultBadge}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(addr)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(addr.id)}
                    disabled={deleteMutation.isPending}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">{addr.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>
              <p className="text-sm text-gray-700 mt-2">
                {addr.address_line_1}
                {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[addr.area, addr.thana, addr.district, addr.division, addr.postal_code]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {!addr.is_default && (
                <button
                  onClick={() => setDefaultMutation.mutate(addr.id)}
                  disabled={setDefaultMutation.isPending}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  <Check size={12} /> {a.makeDefault}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
          <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 mb-3">{a.empty}</p>
          <Button size="sm" onClick={startCreate}>
            <Plus size={14} /> {a.addFirst}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
