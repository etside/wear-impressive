'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Upload, ImageIcon, Film, ChevronDown, Search, Trash2,
  Undo2, Redo2, Crop, Maximize2, Pencil as PencilIcon,
  Info, Check, X, Sparkles, ChevronRight, Move, Lock, Unlock
} from "lucide-react";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { filesApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";
import type { FileAsset } from "@/lib/api/types";

interface FileRecord {
  id: number; name: string; type: string; mimeType: string;
  size: string; dateAdded: string; altText: string; references: number; url: string;
  width?: number; height?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `Today at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function mapAsset(a: FileAsset): FileRecord {
  return {
    id: a.id,
    name: a.name ?? a.original_name,
    type: a.mime_type?.startsWith('image') ? 'image' : a.mime_type?.startsWith('video') ? 'video' : 'document',
    mimeType: a.mime_type?.split('/').pop()?.toUpperCase() ?? 'FILE',
    size: formatFileSize(a.size ?? 0),
    dateAdded: formatDate(a.created_at),
    altText: a.alt ?? '',
    references: 0,
    url: a.url ?? '',
  };
}

const CROP_PRESETS = [
  { label: "Free",     ratio: null         },
  { label: "1:1",      ratio: 1            },
  { label: "4:3",      ratio: 4 / 3        },
  { label: "16:9",     ratio: 16 / 9       },
  { label: "Portrait", ratio: 3 / 4        },
];

/* ── apply canvas crop ── */
function canvasCrop(src: string, x: number, y: number, w: number, h: number): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, x, y, w, h, 0, 0, w, h);
      resolve(c.toDataURL());
    };
    img.src = src;
  });
}

/* ── apply canvas resize ── */
function canvasResize(src: string, w: number, h: number): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL());
    };
    img.src = src;
  });
}

/* ── Crop Panel ── */
function CropPanel({ file, onApply }: { file: FileRecord; onApply: (url: string) => void }) {
  const [preset, setPreset] = useState<number | null>(null);
  const [busy,   setBusy]   = useState(false);

  const apply = async () => {
    if (!file.url) return;
    setBusy(true);
    const img = new window.Image();
    img.src = file.url;
    await new Promise(r => { img.onload = r; });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let x = 0, y = 0, w = iw, h = ih;
    if (preset !== null) {
      if (iw / ih > preset) { w = Math.round(ih * preset); x = Math.round((iw - w) / 2); }
      else                   { h = Math.round(iw / preset); y = Math.round((ih - h) / 2); }
    }
    const result = await canvasCrop(file.url, x, y, w, h);
    onApply(result);
    setBusy(false);
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      <p className="text-[11px] text-white/50 mb-2">Aspect ratio</p>
      <div className="flex flex-wrap gap-1.5">
        {CROP_PRESETS.map(p => (
          <button key={p.label} onClick={() => setPreset(p.ratio)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              preset === p.ratio ? 'bg-white text-gray-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      {!file.url && (
        <p className="text-[11px] text-amber-400/80">No real image — upload a file to use crop.</p>
      )}
      <button onClick={apply} disabled={busy || !file.url}
        className="w-full h-8 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
        {busy ? 'Applying…' : <><Check size={12} /> Apply Crop</>}
      </button>
    </div>
  );
}

/* ── Resize Panel ── */
function ResizePanel({ file, onApply }: { file: FileRecord; onApply: (url: string, w: number, h: number) => void }) {
  const orig = { w: file.width ?? 800, h: file.height ?? 600 };
  const [w,       setW]       = useState(String(orig.w));
  const [h,       setH]       = useState(String(orig.h));
  const [locked,  setLocked]  = useState(true);
  const [busy,    setBusy]    = useState(false);

  const changeW = (val: string) => {
    setW(val);
    if (locked && val) setH(String(Math.round((parseInt(val) || 0) * orig.h / orig.w)));
  };
  const changeH = (val: string) => {
    setH(val);
    if (locked && val) setW(String(Math.round((parseInt(val) || 0) * orig.w / orig.h)));
  };

  const apply = async () => {
    const nw = parseInt(w) || orig.w, nh = parseInt(h) || orig.h;
    if (!file.url) return;
    setBusy(true);
    const result = await canvasResize(file.url, nw, nh);
    onApply(result, nw, nh);
    setBusy(false);
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-[10px] text-white/40 mb-1">Width (px)</label>
          <input type="number" value={w} onChange={e => changeW(e.target.value)} min={1}
            className="w-full h-8 px-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-white/30" />
        </div>
        <button onClick={() => setLocked(l => !l)}
          className="mt-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors">
          {locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
        <div className="flex-1">
          <label className="block text-[10px] text-white/40 mb-1">Height (px)</label>
          <input type="number" value={h} onChange={e => changeH(e.target.value)} min={1}
            className="w-full h-8 px-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-white/30" />
        </div>
      </div>
      <p className="text-[10px] text-white/30">Original: {orig.w} × {orig.h} px</p>
      {!file.url && <p className="text-[11px] text-amber-400/80">Upload a real image to resize.</p>}
      <button onClick={apply} disabled={busy || !file.url}
        className="w-full h-8 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
        {busy ? 'Applying…' : <><Check size={12} /> Apply Resize</>}
      </button>
    </div>
  );
}

/* ── Draw Panel ── */
function DrawPanel({ file, onApply }: { file: FileRecord; onApply: (url: string) => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [drawing,  setDrawing]  = useState(false);
  const [color,    setColor]    = useState('#ff4444');
  const [size,     setSize]     = useState(4);
  const [loaded,   setLoaded]   = useState(false);
  const lastPos    = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !file.url) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setLoaded(true);
    };
    img.src = file.url;
  }, [file.url]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width  / r.width;
    const scaleY = canvasRef.current!.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPos.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { setDrawing(false); lastPos.current = null; };

  const applyDraw = () => {
    if (!canvasRef.current) return;
    onApply(canvasRef.current.toDataURL());
  };

  const colors = ['#ff4444', '#ff8800', '#ffdd00', '#44ff44', '#4488ff', '#aa44ff', '#ffffff', '#000000'];

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Color picker */}
      <div>
        <p className="text-[10px] text-white/40 mb-1.5">Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded-full border-2 border-white/20 cursor-pointer overflow-hidden bg-transparent" />
        </div>
      </div>
      {/* Brush size */}
      <div>
        <p className="text-[10px] text-white/40 mb-1.5">Brush size: {size}px</p>
        <input type="range" min={1} max={30} value={size} onChange={e => setSize(parseInt(e.target.value))}
          className="w-full accent-white" />
      </div>
      {/* Canvas */}
      {file.url ? (
        <div className="rounded-lg overflow-hidden border border-white/10">
          <canvas ref={canvasRef} style={{ width: '100%', cursor: 'crosshair', display: 'block' }}
            onMouseDown={startDraw} onMouseMove={draw}
            onMouseUp={stopDraw} onMouseLeave={stopDraw} />
        </div>
      ) : (
        <p className="text-[11px] text-amber-400/80">Upload a real image to draw.</p>
      )}
      {loaded && (
        <button onClick={applyDraw}
          className="w-full h-8 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
          <Check size={12} /> Apply Drawing
        </button>
      )}
    </div>
  );
}

/* ── File Editor Modal ── */
function FileEditorModal({ file, onSave, onClose }: {
  file: FileRecord;
  onSave: (updated: Partial<FileRecord>) => void;
  onClose: () => void;
}) {
  const [name,       setName]       = useState(file.name);
  const [altText,    setAltText]    = useState(file.altText);
  const [currentUrl, setCurrentUrl] = useState(file.url);
  const [dimensions, setDimensions] = useState({ w: file.width ?? 0, h: file.height ?? 0 });
  const [showSuggest,setShowSuggest]= useState(!file.altText);
  const [openPanel,  setOpenPanel]  = useState<'crop'|'resize'|'draw'|null>(null);
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50 });

  const suggestion = "Product image on a neutral background";

  const togglePanel = (p: 'crop'|'resize'|'draw') =>
    setOpenPanel(prev => prev === p ? null : p);

  const handleCropApply = (url: string) => {
    setCurrentUrl(url);
    setOpenPanel(null);
  };

  const handleResizeApply = (url: string, w: number, h: number) => {
    setCurrentUrl(url); setDimensions({ w, h }); setOpenPanel(null);
  };

  const handleDrawApply = (url: string) => {
    setCurrentUrl(url); setOpenPanel(null);
  };

  const handleImgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFocalPoint({
      x: Math.round(((e.clientX - rect.left) / rect.width)  * 100),
      y: Math.round(((e.clientY - rect.top)  / rect.height) * 100),
    });
  };

  const handleSave = () => {
    onSave({ name, altText, url: currentUrl, width: dimensions.w, height: dimensions.h });
    onClose();
  };

  const tools: { key: 'crop'|'resize'|'draw'; icon: React.ElementType; label: string }[] = [
    { key: 'crop',   icon: Crop,        label: 'Crop and transform' },
    { key: 'resize', icon: Maximize2,   label: 'Resize'             },
    { key: 'draw',   icon: PencilIcon,  label: 'Draw'               },
  ];

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <span className="text-sm font-medium text-white truncate max-w-[300px]">{name}</span>
        <div className="flex items-center gap-2">
          <button disabled className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 cursor-not-allowed"><Undo2 size={15} /></button>
          <button disabled className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 cursor-not-allowed"><Redo2 size={15} /></button>
          <button onClick={onClose}
            className="h-8 px-3 text-xs text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors font-medium">
            Discard
          </button>
          <button onClick={handleSave}
            className="h-8 px-3 text-xs bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center gap-1.5">
            <Check size={13} /> Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image canvas area */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-[#111] overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle,#666 1px,transparent 1px)', backgroundSize: '20px 20px' }} />

          <div onClick={handleImgClick} className="relative cursor-crosshair select-none" style={{ maxWidth: '60vw', maxHeight: '65vh' }}>
            {currentUrl ? (
              <img src={currentUrl} alt={altText || name} className="max-w-full max-h-[65vh] object-contain rounded-sm shadow-2xl border-2 border-dashed border-blue-400/60" />
            ) : (
              <div className="w-[400px] h-[280px] bg-[#1a237e] rounded-sm shadow-2xl border-2 border-dashed border-blue-400/60 flex items-center justify-center">
                <ImageIcon size={32} className="text-white/40" />
              </div>
            )}
            {/* Focal point */}
            <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}>
              <div className="w-4 h-4 rounded-full border-2 border-white bg-blue-500/50 shadow-lg" />
            </div>
          </div>

          <div className="absolute bottom-5 flex items-center gap-3 bg-black/60 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full">
            <Move size={13} className="text-blue-400" />
            <span>Click or drag to change focal point</span>
            <button onClick={() => setFocalPoint({ x: 50, y: 50 })}
              className="ml-2 px-2.5 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors font-medium">
              Remove
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 bg-[#242424] border-l border-white/10 flex flex-col overflow-y-auto shrink-0">

          {/* Information */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} className="text-white/50" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Information</span>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-white/60 mb-1.5">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:border-white/30 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Alt text</label>
              <input type="text" value={altText} onChange={e => { setAltText(e.target.value); setShowSuggest(false); }}
                placeholder="Describe this image…"
                className="w-full h-9 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:border-white/30 outline-none transition" />
              {showSuggest && !altText && (
                <div className="mt-2 bg-purple-900/40 border border-purple-500/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-purple-300 flex items-center gap-1"><Sparkles size={10} /> Suggestion</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setAltText(suggestion); setShowSuggest(false); }}
                        className="w-5 h-5 flex items-center justify-center rounded text-purple-300 hover:text-white hover:bg-purple-500/40"><Check size={11} /></button>
                      <button onClick={() => setShowSuggest(false)}
                        className="w-5 h-5 flex items-center justify-center rounded text-purple-300 hover:text-white hover:bg-purple-500/40"><X size={11} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-white/70">{suggestion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-4 border-b border-white/10">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">Details</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-white/40">{file.mimeType}</span><span className="text-white/70">{file.size}</span></div>
              {dimensions.w > 0 && <div className="flex justify-between"><span className="text-white/40">Dimensions</span><span className="text-white/70">{dimensions.w} × {dimensions.h} px</span></div>}
              <div className="flex justify-between"><span className="text-white/40">Added</span><span className="text-white/70">{file.dateAdded}</span></div>
              <div className="flex justify-between gap-2"><span className="text-white/40 shrink-0">Used in</span>
                <span className="text-white/70 text-right">{file.references > 0 ? `${file.references} reference${file.references > 1 ? 's' : ''}` : 'Not referenced in your store'}</span>
              </div>
            </div>
          </div>

          {/* Tool sections */}
          {tools.map(({ key, icon: Icon, label }) => (
            <div key={key} className="border-b border-white/10">
              <button onClick={() => togglePanel(key)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="text-white/50 group-hover:text-white/70 transition-colors" />
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
                </div>
                <ChevronRight size={14} className={`text-white/30 transition-transform ${openPanel === key ? 'rotate-90' : ''}`} />
              </button>
              {openPanel === 'crop'   && key === 'crop'   && <CropPanel   file={{ ...file, url: currentUrl }} onApply={handleCropApply} />}
              {openPanel === 'resize' && key === 'resize' && <ResizePanel file={{ ...file, url: currentUrl, width: dimensions.w || file.width, height: dimensions.h || file.height }} onApply={handleResizeApply} />}
              {openPanel === 'draw'   && key === 'draw'   && <DrawPanel   file={{ ...file, url: currentUrl }} onApply={handleDrawApply} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function FilesPage() {
  const queryClient = useQueryClient();

  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [editing,  setEditing]  = useState<FileRecord | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'files', { search }],
    queryFn: () => filesApi.list({ per_page: 100, search: search || undefined }),
  });
  const files = useMemo(() => (data?.data ?? []).map(mapAsset), [data]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'files'] });

  const filtered    = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(f => selected.includes(f.id));

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file),
    onSuccess: () => { invalidate(); showBanner('success', 'File uploaded'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to upload')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => filesApi.delete(id),
    onSuccess: () => { invalidate(); showBanner('success', 'File deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => filesApi.bulkDelete(ids),
    onSuccess: () => { invalidate(); setSelected([]); showBanner('success', 'Files deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, alt }: { id: number; name?: string; alt?: string | null }) =>
      filesApi.update(id, { name, alt }),
    onSuccess: () => { invalidate(); showBanner('success', 'File updated'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to update')),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadMutation.mutate(f);
    e.target.value = '';
  };

  const handleSaveEdit = (id: number, updated: Partial<FileRecord>) => {
    updateMutation.mutate({ id, name: updated.name, alt: updated.altText ?? null });
  };

  return (
    <div className="max-w-[1000px] mx-auto">
      {editing && (
        <FileEditorModal
          file={editing}
          onSave={u => handleSaveEdit(editing.id, u)}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Files</h1>
        <div className="flex items-center">
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload size={14} /> {uploadMutation.isPending ? 'Uploading...' : 'Upload files'}
          </Button>
          <button className="h-8 w-8 flex items-center justify-center border border-l-0 border-black bg-black rounded-r-xl hover:bg-gray-800 -ml-px">
            <ChevronDown size={13} className="text-white" />
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload}
            accept="image/*,video/*,.pdf,.doc,.docx" />
        </div>
      </div>

      {banner && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-14 h-14 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center">
                  <Film size={20} className="text-red-500" />
                </div>
              </div>
              <div className="absolute -right-3 top-1 w-12 h-14 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center">
                <ImageIcon size={18} className="text-teal-500" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Upload and manage your files</p>
            <p className="text-xs text-gray-400 mb-5">Files can be images, videos, documents, and more.</p>
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload size={14} /> Upload files
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-medium text-gray-700">All</div>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search files…"
                  className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
              </div>
              {selected.length > 0 && (
                <button onClick={() => {
                    if (confirm(`Delete ${selected.length} file${selected.length > 1 ? 's' : ''}?`)) bulkDeleteMutation.mutate(selected);
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-800 ml-auto">
                  <Trash2 size={13} /> Delete {selected.length} file{selected.length > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : filtered.map(f => f.id))}
                      className="rounded accent-black" />
                  </th>
                  <th className="text-left px-2 py-3 text-xs font-medium text-gray-500">File name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Alt text</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date added</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">References</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(file => (
                  <tr key={file.id} onClick={() => setEditing(file)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(file.id)}
                        onChange={() => toggleSelect(file.id)} className="rounded accent-black" />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                          {file.url
                            ? <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-[#1a237e] flex items-center justify-center text-white text-[7px] font-bold">IMG</div>
                          }
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{file.name}</p>
                          <p className="text-[11px] text-gray-400">{file.mimeType}{file.width ? ` · ${file.width}×${file.height}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{file.altText || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{file.dateAdded}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{file.size}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{file.references === 0 ? <span className="text-gray-300">—</span> : file.references}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { if (confirm('Delete this file?')) deleteMutation.mutate(file.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2">
              {filtered.map(file => (
                <MobileRowCard
                  key={file.id}
                  selected={selected.includes(file.id)}
                  onSelect={() => toggleSelect(file.id)}
                  header={
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {file.url
                          ? <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-[#1a237e] flex items-center justify-center text-white text-[7px] font-bold">IMG</div>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {file.mimeType}{file.width ? ` · ${file.width}×${file.height}` : ''}
                        </p>
                      </div>
                    </div>
                  }
                  trailing={
                    <span className="text-xs font-medium text-gray-700">{file.size}</span>
                  }
                  meta={
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-gray-500">{file.dateAdded}</span>
                      {file.references > 0 && (
                        <span className="text-gray-500">{file.references} ref{file.references > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  }
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setEditing(file)}
                      >
                        <PencilIcon size={11} /> Edit
                      </Button>
                      <button
                        onClick={() => { if (confirm('Delete this file?')) deleteMutation.mutate(file.id); }}
                        aria-label="Delete file"
                        className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  }
                  details={
                    file.altText ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Alt text</p>
                        <p className="text-sm text-gray-700">{file.altText}</p>
                      </div>
                    ) : null
                  }
                />
              ))}
            </div>

            {filtered.length === 0 && <div className="py-10 text-center text-sm text-gray-400">No files match your search</div>}
          </>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          <span>Learn more about files</span>
        </div>
      </div>
    </div>
  );
}
