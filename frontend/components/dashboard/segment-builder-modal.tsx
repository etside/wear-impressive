'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { GripVertical, Plus, Trash2, X, Wand2 } from 'lucide-react';
import { segmentsApi } from '@/lib/api/services/vendor-customers';
import { categoriesApi, productsApi } from '@/lib/api/services/vendor-products';
import { getApiErrorMessage } from '@/lib/api/client';
import type { CustomerSegment } from '@/lib/api/types';

/* ── Rule types ─────────────────────────────────────────────────────── */

type MatchMode = 'all' | 'any';

type RuleField =
  | 'ordered_attribute'
  | 'total_spent'
  | 'total_orders'
  | 'last_order_at'
  | 'email'
  | 'phone'
  | 'name'
  | 'tags';

type Operator =
  | '=' | '!=' | '>' | '<' | '>=' | '<='
  | 'contains' | 'in' | 'not_in' | 'has' | 'not_has';

interface Rule {
  field: RuleField;
  operator: Operator;
  value: unknown;
}

const RULE_FIELD_OPTIONS: Array<{ value: RuleField; label: string }> = [
  { value: 'ordered_attribute', label: 'Ordered attribute' },
  { value: 'total_spent',       label: 'Total spent' },
  { value: 'total_orders',      label: 'Total orders' },
  { value: 'last_order_at',     label: 'Last order' },
  { value: 'email',             label: 'Email' },
  { value: 'phone',             label: 'Phone' },
  { value: 'name',              label: 'Name' },
  { value: 'tags',              label: 'Tags' },
];

const COMPARE_OPERATORS = [
  { value: '>=',  label: '≥ greater than or equal' },
  { value: '<=',  label: '≤ less than or equal' },
  { value: '>',   label: '> greater than' },
  { value: '<',   label: '< less than' },
  { value: '=',   label: '= equal to' },
  { value: '!=',  label: '≠ not equal to' },
];

function defaultRule(field: RuleField): Rule {
  switch (field) {
    case 'ordered_attribute':
      return { field, operator: 'has', value: { category_id: null, product_id: null, option_label: '', option_value: '' } };
    case 'total_spent':
    case 'total_orders':
      return { field, operator: '>=', value: 0 };
    case 'last_order_at':
      return { field, operator: '>=', value: '' };
    case 'tags':
      return { field, operator: 'contains', value: '' };
    default:
      return { field, operator: 'contains', value: '' };
  }
}

/* ── Component ──────────────────────────────────────────────────────── */

export function SegmentBuilderModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: CustomerSegment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [matchMode, setMatchMode] = useState<MatchMode>(() => {
    const c = existing?.conditions as { match?: MatchMode } | undefined;
    return (c?.match ?? existing?.condition_match ?? 'all') as MatchMode;
  });
  const [rules, setRules] = useState<Rule[]>(() => {
    const c = existing?.conditions as { rules?: Rule[] } | undefined;
    const list = Array.isArray(c?.rules) ? (c!.rules as Rule[]) : [];
    return list.length > 0 ? list : [defaultRule('ordered_attribute')];
  });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const attrQuery = useQuery({
    queryKey: ['vendor', 'customer-segments', 'attribute-options'],
    queryFn: () => segmentsApi.attributeOptions(),
    staleTime: 60_000,
  });
  const attrOptions = attrQuery.data ?? [];

  const categoriesQuery = useQuery({
    queryKey: ['vendor', 'product-categories', 'all'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
    staleTime: 60_000,
  });
  const categories = categoriesQuery.data?.data ?? [];

  const productsQuery = useQuery({
    queryKey: ['vendor', 'products', 'all'],
    queryFn: () => productsApi.list({ per_page: 200 }),
    staleTime: 60_000,
  });
  const products = productsQuery.data?.data ?? [];

  /* ── Preview ── */
  const previewMutation = useMutation({
    mutationFn: () => segmentsApi.preview({
      condition_match: matchMode,
      conditions: { match: matchMode, rules: rules as unknown[] },
    }),
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to preview segment')),
  });

  /* ── Save ── */
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        condition_match: matchMode,
        conditions: { match: matchMode, rules: rules as unknown[] },
      };
      return existing
        ? segmentsApi.update(existing.id, payload)
        : segmentsApi.create(payload);
    },
    onSuccess: () => { onSaved(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to save segment')),
  });

  const addRule = (field: RuleField) => setRules(prev => [...prev, defaultRule(field)]);
  const removeRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx));
  const updateRule = (idx: number, next: Rule) =>
    setRules(prev => prev.map((r, i) => (i === idx ? next : r)));

  const canSave = name.trim().length > 0 && !saveMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {existing ? 'Edit segment' : 'Create segment'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {mutationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {mutationError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Size L buyers — Pants"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this segment is for"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none"
            />
          </div>

          {/* Match mode */}
          <div className="flex items-center gap-4 pt-2 text-sm">
            <span className="text-gray-700">Match customers where</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={matchMode === 'all'}
                onChange={() => setMatchMode('all')}
                className="accent-black"
              />
              <span className="text-xs font-medium">ALL rules match</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={matchMode === 'any'}
                onChange={() => setMatchMode('any')}
                className="accent-black"
              />
              <span className="text-xs font-medium">ANY rule matches</span>
            </label>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <RuleCard
                key={idx}
                rule={rule}
                attrOptions={attrOptions}
                categories={categories}
                products={products}
                onChange={(r) => updateRule(idx, r)}
                onRemove={() => removeRule(idx)}
                removable={rules.length > 1}
              />
            ))}
          </div>

          <AddRuleDropdown onAdd={addRule} />

          {/* Preview */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Preview</h3>
              <button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-200 rounded-lg hover:from-violet-100 hover:to-pink-100 disabled:opacity-60"
              >
                <Wand2 size={11} className="text-violet-600" />
                {previewMutation.isPending ? 'Calculating...' : 'Calculate matches'}
              </button>
            </div>
            {previewMutation.data && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1.5">
                <p><span className="font-semibold">{previewMutation.data.customer_count}</span> customer{previewMutation.data.customer_count === 1 ? '' : 's'} will be in this segment</p>
                {previewMutation.data.sample.length > 0 && (
                  <ul className="space-y-0.5 pl-3">
                    {previewMutation.data.sample.map((c) => (
                      <li key={c.id} className="list-disc list-inside">
                        {c.name} <span className="text-gray-400">· ৳{parseFloat(c.total_spent ?? '0').toLocaleString()}</span>
                      </li>
                    ))}
                    {previewMutation.data.customer_count > previewMutation.data.sample.length && (
                      <li className="text-gray-400 list-disc list-inside">
                        … and {previewMutation.data.customer_count - previewMutation.data.sample.length} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!canSave}>
            {saveMutation.isPending ? 'Saving...' : existing ? 'Save changes' : 'Create segment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Rule card ──────────────────────────────────────────────────────── */

function RuleCard({
  rule, attrOptions, categories, products, onChange, onRemove, removable,
}: {
  rule: Rule;
  attrOptions: Array<{ label: string; values: string[] }>;
  categories: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string }>;
  onChange: (r: Rule) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const changeField = (field: string) => onChange(defaultRule(field as RuleField));

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" />
        <div className="flex-1">
          <SearchableSelect
            options={RULE_FIELD_OPTIONS}
            value={rule.field}
            onChange={changeField}
            size="sm"
            searchable={false}
          />
        </div>
        {removable && (
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {rule.field === 'ordered_attribute' && (
        <OrderedAttributeBody
          rule={rule}
          attrOptions={attrOptions}
          categories={categories}
          products={products}
          onChange={onChange}
        />
      )}
      {(rule.field === 'total_spent' || rule.field === 'total_orders') && (
        <NumericBody rule={rule} onChange={onChange} suffix={rule.field === 'total_spent' ? '৳' : ''} />
      )}
      {rule.field === 'last_order_at' && (
        <DateBody rule={rule} onChange={onChange} />
      )}
      {(rule.field === 'email' || rule.field === 'phone' || rule.field === 'name' || rule.field === 'tags') && (
        <TextBody rule={rule} onChange={onChange} />
      )}
    </div>
  );
}

/* ── Rule bodies ────────────────────────────────────────────────────── */

function OrderedAttributeBody({
  rule, attrOptions, categories, products, onChange,
}: {
  rule: Rule;
  attrOptions: Array<{ label: string; values: string[] }>;
  categories: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string }>;
  onChange: (r: Rule) => void;
}) {
  const v = (rule.value ?? {}) as { category_id?: number | null; product_id?: number | null; option_label?: string; option_value?: string };
  const update = (patch: Partial<typeof v>) => onChange({ ...rule, operator: 'has', value: { ...v, ...patch } });

  const labelOptions = useMemo(
    () => [{ value: '', label: 'Any attribute' }, ...attrOptions.map(a => ({ value: a.label, label: a.label }))],
    [attrOptions]
  );
  const selectedAttr = attrOptions.find(a => a.label === v.option_label);
  const valueOptions = useMemo(() => {
    if (!selectedAttr) return [{ value: '', label: 'Any value' }];
    return [{ value: '', label: 'Any value' }, ...selectedAttr.values.map(val => ({ value: val, label: val }))];
  }, [selectedAttr]);

  const categoryOptions = [
    { value: '', label: 'Any category' },
    ...categories.map(c => ({ value: String(c.id), label: c.name })),
  ];
  const productOptions = [
    { value: '', label: 'Any product' },
    ...products.map(p => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <div className="grid grid-cols-2 gap-2 pl-6">
      <FieldLabel label="Category">
        <SearchableSelect
          options={categoryOptions}
          value={v.category_id ? String(v.category_id) : ''}
          onChange={(val) => update({ category_id: val ? parseInt(val, 10) : null })}
          size="sm"
        />
      </FieldLabel>
      <FieldLabel label="Attribute">
        <SearchableSelect
          options={labelOptions}
          value={v.option_label ?? ''}
          onChange={(val) => update({ option_label: val, option_value: '' })}
          size="sm"
        />
      </FieldLabel>
      <FieldLabel label="Value">
        <SearchableSelect
          options={valueOptions}
          value={v.option_value ?? ''}
          onChange={(val) => update({ option_value: val })}
          size="sm"
          disabled={!v.option_label}
        />
      </FieldLabel>
      <FieldLabel label="Product">
        <SearchableSelect
          options={productOptions}
          value={v.product_id ? String(v.product_id) : ''}
          onChange={(val) => update({ product_id: val ? parseInt(val, 10) : null })}
          size="sm"
        />
      </FieldLabel>
    </div>
  );
}

function NumericBody({ rule, onChange, suffix }: { rule: Rule; onChange: (r: Rule) => void; suffix?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 pl-6">
      <FieldLabel label="Operator">
        <SearchableSelect
          options={COMPARE_OPERATORS}
          value={rule.operator}
          onChange={(v) => onChange({ ...rule, operator: v as Operator })}
          size="sm"
          searchable={false}
        />
      </FieldLabel>
      <FieldLabel label={suffix ? `Amount (${suffix})` : 'Amount'}>
        <input
          type="number"
          value={typeof rule.value === 'number' ? rule.value : String(rule.value ?? '')}
          onChange={(e) => onChange({ ...rule, value: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
        />
      </FieldLabel>
    </div>
  );
}

function DateBody({ rule, onChange }: { rule: Rule; onChange: (r: Rule) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 pl-6">
      <FieldLabel label="Operator">
        <SearchableSelect
          options={[
            { value: '>=', label: 'On or after' },
            { value: '<=', label: 'On or before' },
            { value: '>',  label: 'After' },
            { value: '<',  label: 'Before' },
          ]}
          value={rule.operator}
          onChange={(v) => onChange({ ...rule, operator: v as Operator })}
          size="sm"
          searchable={false}
        />
      </FieldLabel>
      <FieldLabel label="Date">
        <input
          type="date"
          value={typeof rule.value === 'string' ? rule.value : ''}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
        />
      </FieldLabel>
    </div>
  );
}

function TextBody({ rule, onChange }: { rule: Rule; onChange: (r: Rule) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 pl-6">
      <FieldLabel label="Operator">
        <SearchableSelect
          options={[
            { value: 'contains', label: 'Contains' },
            { value: '=',        label: 'Is exactly' },
            { value: '!=',       label: 'Is not' },
          ]}
          value={rule.operator}
          onChange={(v) => onChange({ ...rule, operator: v as Operator })}
          size="sm"
          searchable={false}
        />
      </FieldLabel>
      <FieldLabel label="Value">
        <input
          type="text"
          value={typeof rule.value === 'string' ? rule.value : ''}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
        />
      </FieldLabel>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

/* ── Add rule dropdown ──────────────────────────────────────────────── */

function AddRuleDropdown({ onAdd }: { onAdd: (field: RuleField) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(false);
    if (open) setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [open]);
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 border-dashed rounded-lg hover:bg-gray-50"
      >
        <Plus size={12} /> Add rule
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-56 py-1">
          {RULE_FIELD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onAdd(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
