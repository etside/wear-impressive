'use client';
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSortedDistricts, getThanasForDistrict } from "@/lib/bangladesh-locations";
import {
  Plus, Pencil, Truck, X, Check, ChevronDown, ChevronRight,
  Trash2, Search, MapPin, MoreVertical, Eye, EyeOff,
} from "lucide-react";
import { shippingZonesApi, deliveryPartnersApi } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ShippingZone as ApiShippingZone } from "@/lib/api/types";

const SORTED_DISTRICTS = getSortedDistricts();

interface Zone {
  id: number;
  name: string;
  /** Bangla translation of name — optional; falls back to `name` when empty. */
  name_bn: string;
  /** district → thanas (empty array = all thanas in that district) */
  coverage: Record<string, string[]>;
  rate: number;
  freeThreshold: number | null;
  delivery: string;
  /** Bangla translation of delivery estimate — optional. */
  delivery_bn: string;
  status: 'active' | 'inactive';
}

/* -- District / thana picker ------------------------------------------------ */
function DistrictPicker({
  coverage,
  onChange,
}: {
  coverage: Record<string, string[]>;
  onChange: (c: Record<string, string[]>) => void;
}) {
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  const filtered = search.trim()
    ? SORTED_DISTRICTS.filter(d => d.toLowerCase().includes(search.toLowerCase()))
    : SORTED_DISTRICTS;

  const toggleDistrict = (district: string) => {
    if (coverage[district] !== undefined) {
      const next = { ...coverage };
      delete next[district];
      onChange(next);
    } else {
      onChange({ ...coverage, [district]: [] }); // [] = all thanas
    }
  };

  const toggleThana = (district: string, thana: string) => {
    const current = coverage[district] ?? [];
    const allThanas = getThanasForDistrict(district);
    let next: string[];
    if (current.includes(thana)) {
      next = current.filter(t => t !== thana);
    } else {
      next = [...current, thana];
    }
    // if all thanas selected, collapse back to [] (means all)
    if (next.length === allThanas.length) next = [];
    onChange({ ...coverage, [district]: next });
  };

  const toggleExpand = (d: string) =>
    setExpanded(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const isDistrictChecked    = (d: string) => coverage[d] !== undefined;
  const isDistrictIndeterminate = (d: string) =>
    coverage[d] !== undefined && coverage[d].length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <Search size={13} className="text-gray-400 shrink-0" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search districts…"
          className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400" />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
        {filtered.map(district => {
          const thanas = getThanasForDistrict(district);
          const isOpen = expanded.includes(district);
          const checked = isDistrictChecked(district);
          const indeterminate = isDistrictIndeterminate(district);
          const selectedThanas = coverage[district] ?? [];

          return (
            <div key={district}>
              <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleDistrict(district)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked
                      ? 'bg-black border-black'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}>
                  {checked && (indeterminate
                    ? <span className="w-2 h-0.5 bg-white block" />
                    : <Check size={10} className="text-white" />)}
                </button>

                <span className="flex-1 text-sm text-gray-800">{district}</span>

                {/* thana count badge */}
                {checked && indeterminate && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {selectedThanas.length}/{thanas.length}
                  </span>
                )}
                {checked && !indeterminate && (
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                    All
                  </span>
                )}

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(district)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors">
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {/* Thanas */}
              {isOpen && (
                <div className="bg-gray-50 pl-9 pr-3 pb-2 grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                  {thanas.map(thana => {
                    const thanaChecked = !checked ? false
                      : selectedThanas.length === 0 ? true
                      : selectedThanas.includes(thana);
                    return (
                      <label key={thana} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={thanaChecked}
                          disabled={!checked}
                          onChange={() => {
                            if (!checked) return;
                            // if currently "all", clicking one thana means deselect rest
                            if (selectedThanas.length === 0) {
                              // select all except this one
                              const rest = thanas.filter(t => t !== thana);
                              onChange({ ...coverage, [district]: rest });
                            } else {
                              toggleThana(district, thana);
                            }
                          }}
                          className="accent-black w-3 h-3"
                        />
                        <span className={`text-xs ${checked ? 'text-gray-700' : 'text-gray-400'}`}>{thana}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -- Coverage summary ------------------------------------------------------- */
function coverageSummary(coverage: Record<string, string[]>): string {
  const districts = Object.keys(coverage);
  if (districts.length === 0) return 'No areas selected';
  if (districts.length <= 3) {
    return districts.map(d => {
      const thanas = coverage[d];
      return thanas.length > 0 ? `${d} (${thanas.length} thanas)` : d;
    }).join(', ');
  }
  return `${districts.length} districts`;
}

/* -- Zone Modal ------------------------------------------------------------- */
function ZoneModal({
  zone,
  onClose,
  onSave,
}: {
  zone?: Zone;
  onClose: () => void;
  onSave: (z: Omit<Zone, 'id'>) => void;
}) {
  const [name,          setName]          = useState(zone?.name ?? '');
  const [nameBn,        setNameBn]        = useState(zone?.name_bn ?? '');
  const [coverage,      setCoverage]      = useState<Record<string, string[]>>(zone?.coverage ?? {});
  const [rate,          setRate]          = useState(zone?.rate?.toString() ?? '');
  const [freeThreshold, setFreeThreshold] = useState(zone?.freeThreshold?.toString() ?? '');
  const [delivery,      setDelivery]      = useState(zone?.delivery ?? '');
  const [deliveryBn,    setDeliveryBn]    = useState(zone?.delivery_bn ?? '');
  const [status,        setStatus]        = useState<'active' | 'inactive'>(zone?.status ?? 'active');

  const districtCount = Object.keys(coverage).length;
  const canSave = name.trim() && districtCount > 0 && rate.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {zone ? 'Edit zone' : 'Add zone'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Zone name (EN + BN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Zone name (EN) *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., Inside Dhaka"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Zone name (বাংলা)
                <span className="ml-1 text-gray-400 font-normal">optional</span>
              </label>
              <input type="text" value={nameBn} onChange={e => setNameBn(e.target.value)}
                placeholder="যেমন, ঢাকার ভিতরে"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Coverage */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Coverage *
              {districtCount > 0 && (
                <span className="ml-1.5 text-gray-400 font-normal">
                  — {districtCount} district{districtCount !== 1 ? 's' : ''} selected
                </span>
              )}
            </label>
            <DistrictPicker coverage={coverage} onChange={setCoverage} />
            <p className="text-[11px] text-gray-400 mt-1">
              Select districts, then expand to pick specific thanas (or leave all checked to include all thanas).
            </p>
          </div>

          {/* Rate + free threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Flat rate (৳) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">৳</span>
                <input type="number" min="0" value={rate} onChange={e => setRate(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 pl-6 pr-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Free shipping above (৳)
                <span className="ml-1 text-gray-400 font-normal">optional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">৳</span>
                <input type="number" min="0" value={freeThreshold} onChange={e => setFreeThreshold(e.target.value)}
                  placeholder="e.g., 999"
                  className="w-full h-10 pl-6 pr-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
              </div>
            </div>
          </div>

          {/* Delivery estimate (EN + BN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Delivery estimate (EN)</label>
              <input type="text" value={delivery} onChange={e => setDelivery(e.target.value)}
                placeholder="e.g., 1–2 days"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Delivery estimate (বাংলা)
                <span className="ml-1 text-gray-400 font-normal">optional</span>
              </label>
              <input type="text" value={deliveryBn} onChange={e => setDeliveryBn(e.target.value)}
                placeholder="যেমন, ১–২ দিন"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-4">
              {(['active', 'inactive'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={status === v} onChange={() => setStatus(v)}
                    className="accent-black" />
                  <span className="text-sm text-gray-700 capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave}
            onClick={() => onSave({
              name,
              name_bn: nameBn,
              coverage,
              rate: Number(rate) || 0,
              freeThreshold: freeThreshold ? Number(freeThreshold) : null,
              delivery,
              delivery_bn: deliveryBn,
              status,
            })}>
            <Check size={14} /> {zone ? 'Save changes' : 'Add zone'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -- Delivery Partners ------------------------------------------------------ */
interface DeliveryPartner {
  id: string;
  name: string;
  description: string;
  logo: string; // emoji placeholder
  status: 'active' | 'inactive';
  fields: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[];
  credentials: Record<string, string>;
}

const DELIVERY_PARTNERS: DeliveryPartner[] = [
  {
    id: 'self', name: 'SELF', description: 'Deliver products using your own delivery team',
    logo: '📦', status: 'active', fields: [], credentials: {},
  },
  {
    id: 'steadfast', name: 'STEADFAST', description: 'Deliver products using your Steadfast merchant account',
    logo: '⚡', status: 'inactive',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'Your Steadfast API Key' },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Your Steadfast Secret Key' },
    ],
    credentials: {},
  },
];

/* Helpers to convert between API ShippingZone and UI Zone */
function apiZoneToUi(z: ApiShippingZone): Zone {
  const coverage: Record<string, string[]> = {};
  (z.districts ?? []).forEach(d => {
    if (d) coverage[d.trim()] = []; // empty array = all thanas in district
  });
  return {
    id: z.id,
    name: z.name,
    name_bn: z.name_bn ?? '',
    coverage,
    rate: parseFloat(z.flat_rate ?? '0') || 0,
    freeThreshold: z.free_shipping_threshold != null ? parseFloat(z.free_shipping_threshold) || null : null,
    delivery: z.delivery_estimate ?? '',
    delivery_bn: z.delivery_estimate_bn ?? '',
    status: z.is_active ? 'active' : 'inactive',
  };
}

function uiZoneToApi(z: Omit<Zone, 'id'>) {
  const districts = Object.keys(z.coverage);
  return {
    name: z.name,
    // Send empty string as null so the backend stores SQL NULL rather than '',
    // making the storefront fallback (`name_bn || name`) trivially work.
    name_bn: z.name_bn?.trim() ? z.name_bn.trim() : null,
    districts,
    flat_rate: z.rate,
    free_shipping_threshold: z.freeThreshold,
    delivery_estimate: z.delivery || null,
    delivery_estimate_bn: z.delivery_bn?.trim() ? z.delivery_bn.trim() : null,
    is_active: z.status === 'active',
  };
}

export function ShippingContent() {
  const queryClient = useQueryClient();
  const [shippingTab, setShippingTab] = useState<'charges' | 'partners'>('charges');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  // -- Delivery Partners from API --
  const { data: apiPartners = [] } = useQuery({
    queryKey: ['vendor', 'settings', 'delivery-partners'],
    queryFn: () => deliveryPartnersApi.list(),
  });

  // Merge with UI metadata (fields config from DELIVERY_PARTNERS)
  const partners: DeliveryPartner[] = useMemo(() => {
    if (apiPartners.length === 0) return DELIVERY_PARTNERS;
    return apiPartners
      .filter(ap => DELIVERY_PARTNERS.some(p => p.id === ap.provider))
      .map(ap => {
      const template = DELIVERY_PARTNERS.find(p => p.id === ap.provider) ?? DELIVERY_PARTNERS[0];
      return {
        id: ap.provider,
        name: ap.display_name ?? template.name,
        description: template.description,
        logo: template.logo,
        status: ap.is_active ? 'active' : 'inactive',
        fields: template.fields,
        credentials: (ap.credentials as Record<string, string>) ?? {},
      };
    });
  }, [apiPartners]);

  const [activatePartner, setActivatePartner] = useState<DeliveryPartner | null>(null);
  const [partnerCreds, setPartnerCreds] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, is_active, credentials }: { id: number; is_active?: boolean; credentials?: Record<string, unknown> }) =>
      deliveryPartnersApi.update(id, { is_active, credentials }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'delivery-partners'] });
      setActivatePartner(null); setPartnerCreds({});
      showBanner('success', 'Delivery partner saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save partner')),
  });

  const handleActivate = () => {
    if (!activatePartner) return;
    const apiPartner = apiPartners.find(ap => ap.provider === activatePartner.id);
    if (!apiPartner) { showBanner('error', 'Partner not found'); return; }
    updatePartnerMutation.mutate({ id: apiPartner.id, is_active: true, credentials: partnerCreds });
  };

  const handleDeactivate = (keyId: string) => {
    const apiPartner = apiPartners.find(ap => ap.provider === keyId);
    if (!apiPartner) return;
    updatePartnerMutation.mutate({ id: apiPartner.id, is_active: false });
  };

  // -- Shipping Zones from API --
  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ['vendor', 'settings', 'shipping-zones'],
    queryFn: () => shippingZonesApi.list({ per_page: 100 }),
  });
  const zones: Zone[] = useMemo(() => (zonesData?.data ?? []).map(apiZoneToUi), [zonesData]);

  const invalidateZones = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'shipping-zones'] });

  const createZoneMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof uiZoneToApi>) => shippingZonesApi.create(payload),
    onSuccess: () => { invalidateZones(); setShowModal(false); showBanner('success', 'Zone created'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to create zone')),
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReturnType<typeof uiZoneToApi> }) => shippingZonesApi.update(id, payload),
    onSuccess: () => { invalidateZones(); setShowModal(false); showBanner('success', 'Zone updated'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to update zone')),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => shippingZonesApi.delete(id),
    onSuccess: () => { invalidateZones(); showBanner('success', 'Zone deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete zone')),
  });

  const [showModal,  setShowModal]  = useState(false);
  const [editZone,   setEditZone]   = useState<Zone | undefined>();

  const openAdd  = () => { setEditZone(undefined); setShowModal(true); };
  const openEdit = (z: Zone) => { setEditZone(z); setShowModal(true); };

  const handleSave = (data: Omit<Zone, 'id'>) => {
    const payload = uiZoneToApi(data);
    if (editZone) {
      updateZoneMutation.mutate({ id: editZone.id, payload });
    } else {
      createZoneMutation.mutate(payload);
    }
  };

  const deleteZone = (id: number) => {
    if (confirm('Delete this zone?')) deleteZoneMutation.mutate(id);
  };

  const activeCount = zones.filter(z => z.status === 'active').length;

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}
      {zonesLoading && (
        <div className="text-sm text-gray-400 text-center py-2">Loading zones...</div>
      )}
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {[
          { key: 'charges' as const, label: 'Shipping Charges' },
          { key: 'partners' as const, label: 'Delivery Partners' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setShippingTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              shippingTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- Shipping Charges tab ------------------------------------------ */}
      {shippingTab === 'charges' && (
        <>
          {/* Add zone button */}
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAdd}><Plus size={14} /> Add zone</Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active zones',             value: String(activeCount) },
          { label: 'Total zones',              value: String(zones.length) },
          { label: 'Free shipping thresholds', value: String(zones.filter(z => z.freeThreshold).length) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {zones.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Truck size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">No zones yet</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Create shipping zones to define delivery areas, rates, and estimated delivery times.
          </p>
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Add zone</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map(z => (
            <div key={z.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Truck size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{z.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    z.status === 'active'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {z.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={11} /> {coverageSummary(z.coverage)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Truck size={11} /> ৳{z.rate}
                    {z.freeThreshold ? ` · Free above ৳${z.freeThreshold}` : ''}
                  </span>
                  {z.delivery && (
                    <span className="text-xs text-gray-500">{z.delivery}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(z)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteZone(z.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ZoneModal
          zone={editZone}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
        </>
      )}

      {/* -- Delivery Partners tab ----------------------------------------- */}
      {shippingTab === 'partners' && (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Delivery Partners</h3>
            <p className="text-xs text-gray-500 mt-0.5">Add your preferred shipping partners to enable automated delivery</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
              <span className="text-xs font-medium text-gray-500">Delivery Partner</span>
              <span className="text-xs font-medium text-gray-500">Action</span>
            </div>

            {/* Partner rows */}
            {partners.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between px-5 py-4 ${i < partners.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                    {p.logo}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    {p.status === 'active' ? (
                      <p className="text-xs text-green-600 font-medium">Active</p>
                    ) : (
                      <p className="text-xs text-gray-500">{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.status === 'active' && p.id !== 'self' ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => {
                        setPartnerCreds(p.credentials);
                        setActivatePartner(p);
                      }}>
                        Change Info
                      </Button>
                      <button onClick={() => handleDeactivate(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <MoreVertical size={16} />
                      </button>
                    </>
                  ) : p.id === 'self' ? (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">In Your Plan</span>
                  ) : (
                    <Button size="sm" onClick={() => {
                      setPartnerCreds({});
                      setShowPasswords({});
                      setActivatePartner(p);
                    }}>
                      Activate now
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- Activate Partner Modal ---------------------------------------- */}
      {activatePartner && activatePartner.fields.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base">
                  {activatePartner.logo}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {activatePartner.status === 'active' ? `Update ${activatePartner.name}` : `Activate ${activatePartner.name}`}
                  </h3>
                  <p className="text-[11px] text-gray-500">Enter your merchant API credentials</p>
                </div>
              </div>
              <button onClick={() => setActivatePartner(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {activatePartner.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <div className="relative">
                    <input
                      type={f.type === 'password' && !showPasswords[f.key] ? 'password' : 'text'}
                      value={partnerCreds[f.key] || ''}
                      onChange={e => setPartnerCreds(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none pr-10"
                    />
                    {f.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">
                You can find these credentials in your {activatePartner.name} merchant dashboard.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setActivatePartner(null)}>Cancel</Button>
              <Button size="sm" onClick={handleActivate}
                disabled={activatePartner.fields.some(f => !partnerCreds[f.key]?.trim())}>
                {activatePartner.status === 'active' ? 'Update' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
