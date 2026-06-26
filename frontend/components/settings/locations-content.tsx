'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getSortedDistricts, getThanasForDistrict } from "@/lib/bangladesh-locations";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Plus, MapPin, Phone, User, X, Check, Clock, Building2,
  ChevronDown, Trash2, Pencil, Globe, Mail, Star
} from "lucide-react";
import { branchesApi, type BranchCreatePayload } from "@/lib/api/services/vendor-inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Branch } from "@/lib/api/types";

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SORTED_DISTRICTS = getSortedDistricts();

interface LocalBranchInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  thana: string;
  isMain: boolean;
}

function BranchModal({
  branch,
  onClose,
  onSave,
  isSaving,
  errorMsg,
}: {
  branch?: Branch;
  onClose: () => void;
  onSave: (b: LocalBranchInput) => void;
  isSaving?: boolean;
  errorMsg?: string | null;
}) {
  const [name,     setName]     = useState(branch?.name    ?? '');
  const [phone,    setPhone]    = useState(branch?.phone   ?? '');
  const [email,    setEmail]    = useState(branch?.email   ?? '');
  const [address,  setAddress]  = useState(branch?.address ?? '');
  const [district, setDistrict] = useState(branch?.district ?? '');
  const [thana,    setThana]    = useState(branch?.thana    ?? '');
  const [isMain,   setIsMain]   = useState(branch?.is_main  ?? false);

  const thanas = district ? getThanasForDistrict(district) : [];

  const handleDistrict = (val: string) => {
    setDistrict(val);
    setThana('');
  };

  const canSave = name.trim() && phone.trim() && district && thana;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {branch ? 'Edit branch' : 'Add branch'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Basic info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g., Dhanmondi Branch"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="branch@example.com"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isMain} onChange={e => setIsMain(e.target.checked)} className="accent-black" />
                <span className="text-sm text-gray-700">Set as main branch</span>
              </label>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    label="District *"
                    options={SORTED_DISTRICTS.map(d => ({ value: d, label: d }))}
                    value={district}
                    onChange={(v) => handleDistrict(v)}
                    placeholder="Select district"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Thana / Upazila *"
                    options={thanas.map(t => ({ value: t, label: t }))}
                    value={thana}
                    onChange={(v) => setThana(v)}
                    placeholder={district ? 'Select thana' : 'Select district first'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="House/flat number, road, landmark…"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave || isSaving}
            onClick={() => onSave({ name, phone, email, address, district, thana, isMain })}>
            <Check size={14} /> {isSaving ? 'Saving...' : branch ? 'Save changes' : 'Add branch'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LocationsContent() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | undefined>();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'branches'],
    queryFn: () => branchesApi.list(),
  });

  const branches = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'branches'] });

  const createMutation = useMutation({
    mutationFn: (payload: BranchCreatePayload) => branchesApi.create(payload),
    onSuccess: () => { setMutationError(null); setShowModal(false); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to create branch')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BranchCreatePayload }) => branchesApi.update(id, payload),
    onSuccess: () => { setMutationError(null); setShowModal(false); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to update branch')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchesApi.delete(id),
    onSuccess: () => invalidate(),
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to delete branch')),
  });

  const setMainMutation = useMutation({
    mutationFn: (id: number) => branchesApi.setMain(id),
    onSuccess: () => invalidate(),
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to set main branch')),
  });

  const openAdd = () => { setEditBranch(undefined); setMutationError(null); setShowModal(true); };
  const openEdit = (b: Branch) => { setEditBranch(b); setMutationError(null); setShowModal(true); };

  const handleSave = (data: LocalBranchInput) => {
    const payload: BranchCreatePayload = {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      district: data.district || null,
      thana: data.thana || null,
      is_main: data.isMain,
    };
    if (editBranch) {
      updateMutation.mutate({ id: editBranch.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openAdd}><Plus size={14} /> Add branch</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {getApiErrorMessage(error, 'Failed to load branches')}
        </div>
      )}

      {mutationError && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {mutationError}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">No branches yet</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Add your physical store locations to manage staff, inventory, and POS by branch.
          </p>
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Add branch</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map(b => (
            <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{b.name}</span>
                  {b.is_main && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Main</span>
                  )}
                  {!b.is_active && (
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {(b.thana || b.district) && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={11} /> {[b.thana, b.district].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {b.phone && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={11} /> {b.phone}
                    </span>
                  )}
                  {b.email && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail size={11} /> {b.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!b.is_main && (
                  <button onClick={() => setMainMutation.mutate(b.id)}
                    disabled={setMainMutation.isPending}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600"
                    title="Set as main branch">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => openEdit(b)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete branch "${b.name}"?`)) {
                      deleteMutation.mutate(b.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BranchModal
          branch={editBranch}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          isSaving={isSaving}
          errorMsg={mutationError}
        />
      )}
    </div>
  );
}
