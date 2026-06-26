"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload, Download, X, Check, AlertTriangle, Users, Trash2,
} from "lucide-react";
import { useLang } from "@/lib/i18n/context";

/* ── Types ─────────────────────────────────────────────────────────── */
type ImportRow = {
  _rowNum: number;
  _errors: string[];
  _valid: boolean;
  name: string;
  phone: string;
  address: string;
};

/* ── CSV helpers ───────────────────────────────────────────────────── */
function quoteCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (handles quoted fields)
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') { current += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function validateRow(
  row: Record<string, string>,
  rowNum: number,
  errName = 'Name is required',
  errPhone = 'Phone is required',
): ImportRow {
  const errors: string[] = [];
  const name    = (row['name']    || row['full name'] || '').trim();
  const phone   = (row['phone']   || row['phone number'] || row['mobile'] || '').trim();
  const address = (row['address'] || row['address line 1'] || '').trim();

  if (!name)  errors.push(errName);
  if (!phone) errors.push(errPhone);

  return { _rowNum: rowNum, _errors: errors, _valid: errors.length === 0, name, phone, address };
}

/* ── Template ──────────────────────────────────────────────────────── */
function generateTemplate(): string {
  const headers = ['Name', 'Phone', 'Address'].map(quoteCSV).join(',');
  const example1 = ['Rahim Uddin', '+8801711234567', 'House 12, Road 5, Uttara, Dhaka'].map(quoteCSV).join(',');
  const example2 = ['Fatema Begum', '+8801812345678', ''].map(quoteCSV).join(',');
  return [headers, example1, example2].join('\n');
}

/* ── EditableCell ──────────────────────────────────────────────────── */
function EditableCell({ value, onChange, placeholder, hasError }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-full px-2 py-1 text-xs bg-transparent border rounded focus:outline-none focus:ring-1 focus:ring-gray-400 ${
        hasError ? 'border-red-300 bg-red-50' : 'border-transparent hover:border-gray-200 focus:border-gray-400'
      }`}
    />
  );
}

/* ── Main Component ────────────────────────────────────────────────── */
export function CustomerImportWizard({ onClose, onImport }: {
  onClose: () => void;
  onImport: (rows: ImportRow[]) => Promise<{ imported: number; failed: number; errors?: { row: number; name: string; error: string }[] }>;
}) {
  const { t } = useLang();
  const ci = t.customerImport;

  const [step, setStep]             = useState(1);
  const [fileName, setFileName]     = useState('');
  const [rows, setRows]             = useState<ImportRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: { row: number; name: string; error: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = rows.filter(r => r._valid).length;
  const errorCount = rows.filter(r => !r._valid).length;

  /* ── File handling ─────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv'].includes(ext || '')) {
      alert(ci.errCsvOnly);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = parsed.map((row, i) => validateRow(row, i + 1, ci.errName, ci.errPhone));
      setRows(validated);
      setStep(2);
    };
    reader.readAsText(file);
  }, [ci]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── Row editing ───────────────────────────────────── */
  const updateCell = (rowIdx: number, key: keyof Pick<ImportRow, 'name' | 'phone' | 'address'>, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const updated = { ...r, [key]: value };
      return validateRow({ name: updated.name, phone: updated.phone, address: updated.address }, updated._rowNum, ci.errName, ci.errPhone);
    }));
  };

  const deleteRow = (rowIdx: number) => {
    setRows(prev => prev.filter((_, i) => i !== rowIdx));
    setSelectedRows(prev => { const s = new Set(prev); s.delete(rowIdx); return s; });
  };

  const toggleSelect = (rowIdx: number) => {
    setSelectedRows(prev => {
      const s = new Set(prev);
      s.has(rowIdx) ? s.delete(rowIdx) : s.add(rowIdx);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === rows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((_, i) => i)));
  };

  const deleteSelected = () => {
    setRows(prev => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  };

  /* ── Import ────────────────────────────────────────── */
  const confirmImport = async () => {
    const validRows = rows.filter(r => r._valid);
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const result = await onImport(validRows);
      setImportResult({ success: result.imported, errors: result.errors ?? [] });
      setStep(3);
    } catch {
      setImportResult({ success: 0, errors: [{ row: 0, name: '', error: ci.errImportFailed }] });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  /* ── Template download ─────────────────────────────── */
  const downloadTemplate = () => {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Column guide data ─────────────────────────────── */
  const columnGuide = [
    { col: ci.nameLabel,    req: true,  desc: ci.nameDesc,    ex: 'Rahim Uddin' },
    { col: ci.phoneLabel,   req: true,  desc: ci.phoneDesc,   ex: '+8801711234567' },
    { col: ci.addressLabel, req: false, desc: ci.addressDesc, ex: 'House 12, Road 5, Uttara, Dhaka' },
  ];

  /* ── Step indicator labels ─────────────────────────── */
  const stepLabels = [ci.stepUpload, ci.stepPreview, ci.stepResults];

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-[95vw] max-w-[900px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{ci.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 && ci.step1Sub}
              {step === 2 && `${ci.step2SubPre} ${rows.length} ${ci.step2SubPost}`}
              {step === 3 && ci.step3Sub}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                    s < step ? 'bg-green-500 text-white' :
                    s === step ? 'bg-gray-900 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? <Check size={12} /> : s}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${s === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {stepLabels[s - 1]}
                  </span>
                  {s < 3 && <div className={`w-5 h-px shrink-0 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        {/* ═══════════════ STEP 1: Upload ═══════════════ */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Upload zone */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl py-10 px-6 flex flex-col items-center justify-center gap-3 hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Upload size={22} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{ci.dragDrop}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ci.orBrowse}</p>
              </div>
              <Button variant="secondary" size="sm">{ci.chooseFile}</Button>
            </div>
            <input
              ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />

            {/* Template download */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">{ci.templatePrompt}</p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-3 w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ci.templateTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ci.templateDesc}</p>
                </div>
                <Download size={15} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
              </button>
            </div>

            {/* Column guide */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{ci.colRef}</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-500 font-medium w-32">{ci.colColumn}</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium w-24">{ci.colRequired}</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">{ci.colDesc}</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">{ci.colExample}</th>
                  </tr>
                </thead>
                <tbody>
                  {columnGuide.map(r => (
                    <tr key={r.col} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2 font-medium text-gray-800">{r.col}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          r.req ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.req ? ci.reqBadge : ci.optBadge}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{r.desc}</td>
                      <td className="px-4 py-2 text-gray-400 font-mono">{r.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2: Preview ═══════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Summary bar */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
              <span className="text-xs text-gray-500">{fileName}</span>
              <span className="text-xs font-medium text-gray-700">{rows.length} {ci.summaryRows}</span>
              <span className="text-xs font-medium text-green-600">{validCount} {ci.summaryValid}</span>
              {errorCount > 0 && (
                <span className="text-xs font-medium text-red-500">{errorCount} {ci.summaryErrors}</span>
              )}
              {selectedRows.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  <Trash2 size={12} /> {ci.deletePre} {selectedRows.size} {ci.deletePost}
                </button>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {/* Desktop table */}
              <div className="hidden md:block min-w-[600px]">
                {/* Table header */}
                <div className="grid grid-cols-[32px_28px_1fr_160px_1fr_44px_32px] gap-x-2 px-3 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-3 h-3 accent-gray-800"
                      checked={selectedRows.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">#</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{ci.nameLabel}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{ci.phoneLabel}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{ci.addressLabel}</div>
                  <div />
                  <div />
                </div>

                {/* Rows */}
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[32px_28px_1fr_160px_1fr_44px_32px] gap-x-2 px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50/50 items-center ${
                      !row._valid ? 'bg-red-50/30' : ''
                    } ${selectedRows.has(i) ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="w-3 h-3 accent-gray-800"
                        checked={selectedRows.has(i)}
                        onChange={() => toggleSelect(i)}
                      />
                    </div>

                    {/* Row number */}
                    <div className="text-[10px] text-gray-400">{row._rowNum}</div>

                    {/* Name */}
                    <EditableCell
                      value={row.name}
                      onChange={v => updateCell(i, 'name', v)}
                      placeholder={ci.placeholderName}
                      hasError={row._errors.some(e => e === ci.errName)}
                    />

                    {/* Phone */}
                    <EditableCell
                      value={row.phone}
                      onChange={v => updateCell(i, 'phone', v)}
                      placeholder="+880..."
                      hasError={row._errors.some(e => e === ci.errPhone)}
                    />

                    {/* Address */}
                    <EditableCell
                      value={row.address}
                      onChange={v => updateCell(i, 'address', v)}
                      placeholder={ci.placeholderAddress}
                    />

                    {/* Valid indicator */}
                    <div className="flex items-center justify-center">
                      {row._valid ? (
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={10} className="text-green-600" />
                        </div>
                      ) : (
                        <div className="relative group">
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center cursor-help">
                            <AlertTriangle size={10} className="text-red-500" />
                          </div>
                          <div className="absolute bottom-full right-0 mb-1 w-48 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 hidden group-hover:block z-20 leading-relaxed">
                            {row._errors.join(' · ')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteRow(i)}
                      className="flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <div key={i} className={`p-3 space-y-2 ${!row._valid ? 'bg-red-50/40' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400">{ci.mobileRow} {row._rowNum}</span>
                      {row._valid ? (
                        <span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><Check size={10} /> {ci.mobileValid}</span>
                      ) : (
                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={10} /> {row._errors.join(', ')}</span>
                      )}
                      <button type="button" onClick={() => deleteRow(i)} className="text-gray-300 hover:text-red-500 ml-auto"><X size={14} /></button>
                    </div>
                    <input type="text" value={row.name} onChange={e => updateCell(i, 'name', e.target.value)}
                      placeholder={ci.placeholderName} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
                    <input type="text" value={row.phone} onChange={e => updateCell(i, 'phone', e.target.value)}
                      placeholder="+880..." className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
                    <input type="text" value={row.address} onChange={e => updateCell(i, 'address', e.target.value)}
                      placeholder={ci.placeholderAddress} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-white">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>{ci.back}</Button>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <p className="text-xs text-red-500">
                    {errorCount} {errorCount > 1 ? ci.willSkipPlural : ci.willSkip}
                  </p>
                )}
                <Button
                  size="sm"
                  onClick={confirmImport}
                  disabled={validCount === 0 || importing}
                >
                  {importing
                    ? ci.importing
                    : `${ci.importPre} ${validCount} ${validCount !== 1 ? ci.importCustomers : ci.importCustomer}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3: Results ═══════════════ */}
        {step === 3 && importResult && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Success summary */}
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {importResult.success} {importResult.success !== 1 ? ci.successCustomers : ci.successCustomer}
                </p>
                {importResult.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {importResult.errors.length} {importResult.errors.length > 1 ? ci.failedPlural : ci.failedSingle}
                  </p>
                )}
              </div>
            </div>

            {/* Error list */}
            {importResult.errors.length > 0 && (
              <div className="border border-red-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
                  <p className="text-xs font-semibold text-red-700">{ci.failedTitle}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-red-50">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium w-12">{ci.tableRow}</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">{ci.nameLabel}</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">{ci.tableReason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((err, i) => (
                      <tr key={i} className="border-b border-red-50 last:border-0">
                        <td className="px-4 py-2 text-gray-500">{err.row}</td>
                        <td className="px-4 py-2 text-gray-700">{err.name}</td>
                        <td className="px-4 py-2 text-red-600">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={onClose}>{ci.done}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── re-export types for parent ────────────────────────────────────── */
export type { ImportRow as CustomerImportRow };
