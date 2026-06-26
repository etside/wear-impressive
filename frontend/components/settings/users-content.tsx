'use client';
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  UserPlus, X, Check, Shield, Users,
  Lock, Pencil, Trash2, AlertCircle, EyeOff, Eye, Plus, Phone, Mail, Send
} from "lucide-react";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { vendorStaffApi } from "@/lib/api/services/vendor-staff";
import { branchesApi } from "@/lib/api/services/vendor-inventory";
import { settingsApi } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Staff } from "@/lib/api/types";

interface BranchOption { id: number; name: string }

const CUSTOM_ROLES_KEY = 'team.custom_roles';

/* -- Types -- */
interface StaffMember {
  id: number;
  name: string;
  phone: string;
  email: string;
  roleId: number;
  roleName: string;
  branchIds: number[] | null; // null = all branches
  isOwner: boolean;
  isActive: boolean;
  lastActive: string;
  initials: string;
}

interface Role {
  id: number;
  name: string;
  isSystem: boolean;
  description: string;
  permissions: string[];
  memberCount: number;
}

/* -- Permission matrix -- */
const MODULES = [
  { key: "products",   label: "Products" },
  { key: "orders",     label: "Orders" },
  { key: "inventory",  label: "Inventory" },
  { key: "pos",        label: "POS" },
  { key: "discounts",  label: "Discounts" },
  { key: "customers",  label: "Customers" },
  { key: "marketing",  label: "Marketing" },
  { key: "finance",    label: "Finance" },
  { key: "team",       label: "Team" },
  { key: "settings",   label: "Settings" },
];

const ACTIONS: Record<string, string[]> = {
  products:   ["view", "create", "edit", "delete"],
  orders:     ["view", "edit_status", "refund"],
  inventory:  ["view", "adjust"],
  pos:        ["access", "sales", "returns"],
  discounts:  ["view", "create", "edit", "delete"],
  customers:  ["view"],
  marketing:  ["view", "manage"],
  finance:    ["view", "payouts"],
  team:       ["manage"],
  settings:   ["edit"],
};

const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  Manager: MODULES.flatMap(m => ACTIONS[m.key].map(a => `${m.key}.${a}`)),
  Staff:   ["products.view", "orders.view", "orders.edit_status", "inventory.view", "pos.access", "pos.sales", "customers.view"],
  Cashier: ["pos.access", "pos.sales", "pos.returns", "products.view"],
};

/* -- Helpers -- */
function roleIdFromName(name: string, roles: Role[]): number {
  return roles.find(r => r.name.toLowerCase() === name?.toLowerCase())?.id ?? 0;
}

function mapApiStaffToMember(s: Staff, roles: Role[]): StaffMember {
  const initials = (s.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isOwner = (s.role || '').toLowerCase() === 'owner';
  const roleName = isOwner
    ? 'Owner'
    : roles.find(r => r.name.toLowerCase() === (s.role || '').toLowerCase())?.name ?? (s.role || 'Staff');
  return {
    id: s.id,
    name: s.name,
    phone: s.phone ?? '',
    email: s.email ?? '',
    roleId: isOwner ? 0 : roleIdFromName(roleName, roles),
    roleName,
    branchIds: s.branch_ids ?? null,
    isOwner,
    isActive: s.active,
    lastActive: s.last_login_at ?? (s.accepted_at ? '—' : 'Invite pending'),
    initials: initials || 'U',
  };
}

const initialRoles: Role[] = [
  { id: 1, name: "Manager", isSystem: true, description: "Full access except owner settings", permissions: SYSTEM_ROLE_PERMISSIONS.Manager, memberCount: 1 },
  { id: 2, name: "Staff", isSystem: true, description: "Can manage orders and view products", permissions: SYSTEM_ROLE_PERMISSIONS.Staff, memberCount: 1 },
  { id: 3, name: "Cashier", isSystem: true, description: "POS access only", permissions: SYSTEM_ROLE_PERMISSIONS.Cashier, memberCount: 1 },
];

const roleBg: Record<string, string> = {
  Owner:   "bg-black text-white",
  Manager: "bg-blue-600 text-white",
  Staff:   "bg-gray-600 text-white",
  Cashier: "bg-orange-500 text-white",
};

/* -- Add Member Modal -- */
function AddMemberModal({ roles, branches, onClose, onSave }: {
  roles: Role[];
  branches: BranchOption[];
  onClose: () => void;
  onSave: (data: { name: string; phone: string; email: string; roleId: number; branchIds: number[] | null; password: string; sendCredentials: boolean }) => void;
}) {
  const [name,             setName]             = useState('');
  const [phone,            setPhone]            = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [sendCredentials,  setSendCredentials]  = useState(false);
  const [roleId,           setRoleId]           = useState(roles[0]?.id ?? 0);
  const [allBranches,      setAllBranches]      = useState(true);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);

  const valid = name.trim() && phone.trim() && password.length >= 6;

  const toggleBranch = (id: number) =>
    setSelectedBranches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Add Team Member</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Karim Hossain"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX"
                  className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
            </div>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); if (!e.target.value) setSendCredentials(false); }}
                placeholder="staff@example.com"
                className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Set Password *</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                className="w-full h-10 pl-8 pr-10 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {password && password.length < 6 && (
              <p className="text-[11px] text-red-500 mt-1">Password must be at least 6 characters</p>
            )}
          </div>

          {/* Role */}
          <div>
            <SearchableSelect
              label="Role *"
              options={roles.map(r => ({ value: String(r.id), label: `${r.name} — ${r.description}` }))}
              value={String(roleId)}
              onChange={(v) => setRoleId(parseInt(v))}
              placeholder="Select role"
              searchable={false}
            />
          </div>

          {/* Branch access */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Branch Access</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={allBranches} onChange={() => setAllBranches(true)} className="accent-black" />
                <span className="text-sm text-gray-700">All branches (current + future)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!allBranches} onChange={() => setAllBranches(false)} className="accent-black" />
                <span className="text-sm text-gray-700">Specific branches</span>
              </label>
            </div>
            {!allBranches && (
              <div className="mt-2 space-y-1.5 pl-6">
                {branches.length === 0 && (
                  <p className="text-xs text-gray-400">No branches yet — add one under Locations.</p>
                )}
                {branches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedBranches.includes(b.id)}
                      onChange={() => toggleBranch(b.id)} className="rounded accent-black" />
                    <span className="text-sm text-gray-700">{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send credentials */}
          {email && (
            <label className="flex items-start gap-3 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl p-3">
              <input type="checkbox" checked={sendCredentials} onChange={e => setSendCredentials(e.target.checked)}
                className="accent-black mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-800">Send login credentials via email</p>
                <p className="text-[11px] text-gray-500 mt-0.5">We will email {email} with the phone number and password you set.</p>
              </div>
            </label>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!valid}
            onClick={() => {
              onSave({
                name, phone, email, roleId,
                branchIds: allBranches ? null : selectedBranches,
                password,
                sendCredentials: sendCredentials && !!email,
              });
              onClose();
            }}>
            <UserPlus size={14} /> Add Member
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -- Edit Member Modal -- */
function EditMemberModal({ member, roles, branches, onClose, onSave }: {
  member: StaffMember;
  roles: Role[];
  branches: BranchOption[];
  onClose: () => void;
  onSave: (data: Partial<StaffMember> & { newPassword?: string }) => void;
}) {
  const [name,             setName]             = useState(member.name);
  const [phone,            setPhone]            = useState(member.phone);
  const [email,            setEmail]            = useState(member.email);
  const [roleId,           setRoleId]           = useState(member.roleId);
  const [allBranches,      setAllBranches]      = useState(member.branchIds === null);
  const [selectedBranches, setSelectedBranches] = useState<number[]>(member.branchIds ?? []);
  const [changePassword,   setChangePassword]   = useState(false);
  const [newPassword,      setNewPassword]      = useState('');
  const [showPassword,     setShowPassword]     = useState(false);

  const valid = name.trim() && phone.trim() && (!changePassword || newPassword.length >= 6);

  const toggleBranch = (id: number) =>
    setSelectedBranches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Edit Member</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Password reset */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer bg-gray-50">
              <input type="checkbox" checked={changePassword} onChange={e => { setChangePassword(e.target.checked); setNewPassword(''); }}
                className="accent-black shrink-0" />
              <span className="text-xs font-medium text-gray-700">Set a new password</span>
            </label>
            {changePassword && (
              <div className="px-3 pb-3 pt-2 bg-white">
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
                    className="w-full h-10 pl-8 pr-10 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {newPassword && newPassword.length < 6 && (
                  <p className="text-[11px] text-red-500 mt-1">Password must be at least 6 characters</p>
                )}
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <SearchableSelect
              label="Role *"
              options={roles.map(r => ({ value: String(r.id), label: `${r.name} — ${r.description}` }))}
              value={String(roleId)}
              onChange={(v) => setRoleId(parseInt(v))}
              placeholder="Select role"
              searchable={false}
            />
          </div>

          {/* Branch access */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Branch Access</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={allBranches} onChange={() => setAllBranches(true)} className="accent-black" />
                <span className="text-sm text-gray-700">All branches (current + future)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!allBranches} onChange={() => setAllBranches(false)} className="accent-black" />
                <span className="text-sm text-gray-700">Specific branches</span>
              </label>
            </div>
            {!allBranches && (
              <div className="mt-2 space-y-1.5 pl-6">
                {branches.length === 0 && (
                  <p className="text-xs text-gray-400">No branches yet — add one under Locations.</p>
                )}
                {branches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedBranches.includes(b.id)}
                      onChange={() => toggleBranch(b.id)} className="rounded accent-black" />
                    <span className="text-sm text-gray-700">{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!valid}
            onClick={() => {
              const role = roles.find(r => r.id === roleId);
              onSave({
                name, phone, email, roleId,
                roleName: role?.name ?? member.roleName,
                branchIds: allBranches ? null : selectedBranches,
                initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                ...(changePassword && newPassword ? { newPassword } : {}),
              });
              onClose();
            }}>
            <Check size={14} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -- Role Edit Modal -- */
function RoleModal({ role, onClose, onSave }: {
  role?: Role;
  onClose: () => void;
  onSave: (data: { name: string; description: string; permissions: string[] }) => void;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);

  const toggle = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const toggleModule = (module: string) => {
    const actions = ACTIONS[module].map(a => `${module}.${a}`);
    const allChecked = actions.every(p => permissions.includes(p));
    if (allChecked) {
      setPermissions(prev => prev.filter(p => !actions.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...actions])]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-sm font-bold text-gray-900">{role ? 'Edit Role' : 'Create Custom Role'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Role Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Store Supervisor"
                disabled={role?.isSystem}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description"
                disabled={role?.isSystem}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
          </div>

          {role?.isSystem && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex gap-2">
              <AlertCircle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">System roles cannot be renamed, but you can view their permissions below.</p>
            </div>
          )}

          {/* Permission matrix */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">Permissions</p>
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-32">Module</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-gray-600">View</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-gray-600">Create</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-gray-600">Edit</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-gray-600">Delete</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-gray-600">Other</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map(mod => {
                    const actions = ACTIONS[mod.key];
                    const modPerms = actions.map(a => `${mod.key}.${a}`);
                    const allChecked = modPerms.every(p => permissions.includes(p));
                    const someChecked = modPerms.some(p => permissions.includes(p));
                    const standardActions = ["view", "create", "edit", "delete"];
                    const otherActions = actions.filter(a => !standardActions.includes(a));

                    return (
                      <tr key={mod.key} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <input type="checkbox"
                              checked={allChecked}
                              ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                              onChange={() => !role?.isSystem && toggleModule(mod.key)}
                              disabled={role?.isSystem}
                              className="rounded accent-black" />
                            <span className="font-semibold text-gray-800">{mod.label}</span>
                          </div>
                        </td>
                        {standardActions.map(action => {
                          const perm = `${mod.key}.${action}`;
                          const has = actions.includes(action);
                          return (
                            <td key={action} className="px-2 py-2.5 text-center">
                              {has ? (
                                <input type="checkbox"
                                  checked={permissions.includes(perm)}
                                  onChange={() => !role?.isSystem && toggle(perm)}
                                  disabled={role?.isSystem}
                                  className="rounded accent-black" />
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2.5 text-center">
                          {otherActions.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {otherActions.map(a => {
                                const perm = `${mod.key}.${a}`;
                                return (
                                  <label key={a} className="flex items-center gap-0.5 cursor-pointer">
                                    <input type="checkbox"
                                      checked={permissions.includes(perm)}
                                      onChange={() => !role?.isSystem && toggle(perm)}
                                      disabled={role?.isSystem}
                                      className="rounded accent-black" />
                                    <span className="text-[10px] text-gray-500 capitalize">{a.replace('_', ' ')}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 border-t border-gray-100 pt-4 sticky bottom-0 bg-white">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            {role?.isSystem ? 'Close' : 'Cancel'}
          </Button>
          {!role?.isSystem && (
            <Button size="sm" className="flex-1" disabled={!name}
              onClick={() => { onSave({ name, description, permissions }); onClose(); }}>
              <Check size={14} /> {role ? 'Save Role' : 'Create Role'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -- Main Content -- */
export function UsersContent() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [editMember,    setEditMember]    = useState<StaffMember | undefined>();
  const [editRole,      setEditRole]      = useState<Role | undefined>();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [banner,        setBanner]        = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const staffQuery = useQuery({
    queryKey: ['vendor', 'staff'],
    queryFn: () => vendorStaffApi.list({ per_page: 100 }),
  });

  const branchesQuery = useQuery({
    queryKey: ['vendor', 'branches'],
    queryFn: () => branchesApi.list({ per_page: 100 }),
  });
  const branches = useMemo<BranchOption[]>(
    () => (branchesQuery.data?.data ?? []).map(b => ({ id: b.id, name: b.name })),
    [branchesQuery.data]
  );

  // Custom roles are persisted to a single store-settings key so they
  // survive reloads (system roles are static and live in the bundle).
  // The settings query is the source of truth — no mirrored local state.
  const settingsQuery = useQuery({
    queryKey: ['vendor', 'settings'],
    queryFn: () => settingsApi.get(),
  });
  const customRoles = useMemo<Role[]>(() => {
    const raw = settingsQuery.data?.[CUSTOM_ROLES_KEY];
    if (raw == null) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map((r: Role) => ({ ...r, isSystem: false })) : [];
    } catch {
      return [];
    }
  }, [settingsQuery.data]);

  // Base list for staff→role mapping (memberCount not needed here).
  const baseRoles = useMemo<Role[]>(() => [...initialRoles, ...customRoles], [customRoles]);

  const staff = useMemo<StaffMember[]>(
    () => (staffQuery.data?.data ?? []).map(s => mapApiStaffToMember(s, baseRoles)),
    [staffQuery.data, baseRoles]
  );

  // Display list with live member counts derived from actual staff.
  const roles = useMemo<Role[]>(
    () => baseRoles.map(r => ({
      ...r,
      memberCount: staff.filter(m => m.roleName.toLowerCase() === r.name.toLowerCase()).length,
    })),
    [baseRoles, staff]
  );

  const persistCustomRoles = (next: Role[]) => {
    const serialized = JSON.stringify(next);
    // Optimistic: patch the settings cache so the UI updates immediately.
    qc.setQueryData<Record<string, unknown>>(['vendor', 'settings'], (old) => ({
      ...(old ?? {}),
      [CUSTOM_ROLES_KEY]: serialized,
    }));
    settingsApi.update({
      settings: [{ key: CUSTOM_ROLES_KEY, value: serialized, type: 'json', group: 'general' }],
    })
      .then(() => { qc.invalidateQueries({ queryKey: ['vendor', 'settings'] }); showBanner('success', 'Role saved'); })
      .catch((err) => {
        qc.invalidateQueries({ queryKey: ['vendor', 'settings'] });
        showBanner('error', getApiErrorMessage(err, 'Failed to save role'));
      });
  };

  const inviteMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; email: string; roleId: number; branchIds: number[] | null; password: string; sendCredentials: boolean }) => {
      const role = roles.find(r => r.id === data.roleId);
      return vendorStaffApi.invite({
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        role: (role?.name ?? 'Staff').toLowerCase(),
        permissions: role?.permissions ?? [],
        branch_ids: data.branchIds,
        password: data.password || undefined,
        send_credentials: data.sendCredentials,
      });
    },
    onSuccess: (staff) => {
      qc.invalidateQueries({ queryKey: ['vendor', 'staff'] });
      showBanner('success', staff?.accepted_at ? 'Team member added' : 'Invitation sent');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to add member')),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; data: Partial<StaffMember> & { newPassword?: string } }) => {
      const { id, data } = args;
      const role = data.roleId !== undefined ? roles.find(r => r.id === data.roleId) : undefined;
      return vendorStaffApi.update(id, {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(role ? { role: role.name.toLowerCase(), permissions: role.permissions } : {}),
        ...(data.branchIds !== undefined ? { branch_ids: data.branchIds } : {}),
        ...(data.isActive !== undefined ? { active: data.isActive } : {}),
        ...(data.newPassword ? { password: data.newPassword } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'staff'] });
      showBanner('success', 'Member updated');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to update member')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorStaffApi.destroy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'staff'] });
      showBanner('success', 'Member removed');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to remove member')),
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => vendorStaffApi.resendInvite(id),
    onSuccess: () => showBanner('success', 'Invite resent'),
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to resend invite')),
  });

  const handleAddMember = (data: { name: string; phone: string; email: string; roleId: number; branchIds: number[] | null; password: string; sendCredentials: boolean }) => {
    inviteMutation.mutate(data);
  };

  const handleEditMember = (data: Partial<StaffMember> & { newPassword?: string }) => {
    if (editMember) {
      updateMutation.mutate({ id: editMember.id, data });
    }
    setEditMember(undefined);
  };

  const toggleActive = (id: number) => {
    const member = staff.find(m => m.id === id);
    if (!member || member.isOwner) return;
    updateMutation.mutate({ id, data: { isActive: !member.isActive } });
  };

  const handleSaveRole = (data: { name: string; description: string; permissions: string[] }) => {
    if (editRole && !editRole.isSystem) {
      persistCustomRoles(customRoles.map(r => r.id === editRole.id ? { ...r, ...data } : r));
    } else if (!editRole) {
      persistCustomRoles([...customRoles, { id: Date.now(), ...data, isSystem: false, memberCount: 0 }]);
    }
    setEditRole(undefined);
  };

  const handleDeleteRole = (id: number) => {
    persistCustomRoles(customRoles.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {showAddMember && <AddMemberModal roles={roles} branches={branches} onClose={() => setShowAddMember(false)} onSave={handleAddMember} />}
      {editMember && <EditMemberModal member={editMember} roles={roles} branches={branches} onClose={() => setEditMember(undefined)} onSave={handleEditMember} />}
      {(showRoleModal || editRole) && (
        <RoleModal
          role={editRole}
          onClose={() => { setShowRoleModal(false); setEditRole(undefined); }}
          onSave={handleSaveRole}
        />
      )}

      {banner && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowAddMember(true)}>
          <UserPlus size={14} /> Add Member
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
        <button onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'members' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Users size={13} /> Members ({staff.length})
        </button>
        <button onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'roles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Shield size={13} /> Roles &amp; Permissions
        </button>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Desktop table */}
          <div className="hidden md:block overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Branch Access</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last Active</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading members...</td>
                  </tr>
                )}
                {!staffQuery.isLoading && staff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No team members yet</td>
                  </tr>
                )}
                {staff.map(member => (
                  <tr key={member.id} className={`hover:bg-gray-50 transition-colors ${!member.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${roleBg[member.roleName] ?? 'bg-gray-400 text-white'} flex items-center justify-center text-xs font-bold shrink-0`}>
                          {member.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">{member.name}</span>
                            {member.isOwner && <Lock size={11} className="text-gray-400" />}
                          </div>
                          <span className="text-xs text-gray-400">{member.phone}{member.email ? ` · ${member.email}` : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.isOwner ? (
                        <Badge variant="default">Owner</Badge>
                      ) : (
                        <Badge variant="info">{member.roleName}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {member.branchIds === null ? (
                        <span className="text-xs text-gray-500">All branches</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.branchIds.map(id => {
                            const branch = branches.find(b => b.id === id);
                            return branch ? (
                              <span key={id} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {branch.name.split(' ')[0]}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{member.lastActive}</td>
                    <td className="px-4 py-3 text-center">
                      {member.isOwner ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <ToggleSwitch size="sm" checked={member.isActive} onChange={() => toggleActive(member.id)} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!member.isOwner && (
                        <div className="flex gap-1 justify-end">
                          {member.email && (
                            <button onClick={() => resendMutation.mutate(member.id)}
                              title="Resend invite"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Send size={13} />
                            </button>
                          )}
                          <button onClick={() => setEditMember(member)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteMutation.mutate(member.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-3">
            {staffQuery.isLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading members...</div>
            )}
            {!staffQuery.isLoading && staff.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No team members yet</div>
            )}
            {!staffQuery.isLoading && staff.length > 0 && (
              <div className="space-y-2">
                {staff.map(member => (
                  <MobileRowCard
                    key={member.id}
                    className={!member.isActive ? 'opacity-60' : undefined}
                    header={
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${roleBg[member.roleName] ?? 'bg-gray-400 text-white'} flex items-center justify-center text-xs font-bold shrink-0`}>
                          {member.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm truncate">{member.name}</span>
                            {member.isOwner && <Lock size={11} className="text-gray-400 shrink-0" />}
                            {member.isOwner ? (
                              <Badge variant="default">Owner</Badge>
                            ) : (
                              <Badge variant="info">{member.roleName}</Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 truncate block">
                            {member.phone}{member.email ? ` · ${member.email}` : ''}
                          </span>
                        </div>
                      </div>
                    }
                    meta={
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-gray-500">Last active: {member.lastActive}</span>
                      </div>
                    }
                    actions={
                      member.isOwner ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <>
                          <ToggleSwitch size="sm" checked={member.isActive} onChange={() => toggleActive(member.id)} />
                          {member.email && (
                            <button
                              onClick={() => resendMutation.mutate(member.id)}
                              aria-label="Resend invite"
                              className="h-7 w-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                            >
                              <Send size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditMember(member)}
                            aria-label="Edit member"
                            className="h-7 w-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(member.id)}
                            aria-label="Remove member"
                            className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )
                    }
                    details={
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Branch access</p>
                        {member.branchIds === null ? (
                          <span className="text-sm text-gray-700">All branches</span>
                        ) : member.branchIds.length === 0 ? (
                          <span className="text-sm text-gray-400">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {member.branchIds.map(id => {
                              const branch = branches.find(b => b.id === id);
                              return branch ? (
                                <span key={id} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                  {branch.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowRoleModal(true)}>
              <Plus size={14} /> Create Custom Role
            </Button>
          </div>

          <div className="grid gap-3">
            {roles.map(role => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Shield size={16} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">{role.name}</h3>
                        {role.isSystem && <Badge variant="default">System</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{role.memberCount} member{role.memberCount !== 1 ? 's' : ''}</span>
                    <button onClick={() => setEditRole(role)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title={role.isSystem ? 'View permissions' : 'Edit role'}>
                      <Pencil size={13} />
                    </button>
                    {!role.isSystem && (
                      <button onClick={() => handleDeleteRole(role.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission chips */}
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 8).map(perm => (
                    <span key={perm} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-full font-medium">
                      {perm.replace('.', ': ').replace('_', ' ')}
                    </span>
                  ))}
                  {role.permissions.length > 8 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[11px] rounded-full">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
