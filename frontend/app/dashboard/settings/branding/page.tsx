'use client';
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import {
  generalApi,
  brandingApi,
  settingsApi,
  type BrandingUpdatePayload,
} from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";

const DEFAULT_PRIMARY = '#0A0A0A';
const DEFAULT_ACCENT  = '#2563EB';

export default function BrandingSettingsPage() {
  const { t } = useLang();
  const d = t.dashSettings;
  const queryClient = useQueryClient();

  const logoInputRef    = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef  = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile]   = useState<File | null>(null);
  const [logoPreview, setLogoPreview]       = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview]   = useState<string | null>(null);
  const [removeLogoFlag, setRemoveLogoFlag]         = useState(false);
  const [removeFaviconFlag, setRemoveFaviconFlag]   = useState(false);
  const [removeBannerFlag, setRemoveBannerFlag]     = useState(false);

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor]   = useState(DEFAULT_ACCENT);
  const [colorsDirty, setColorsDirty]   = useState(false);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data: store } = useQuery({
    queryKey: ['vendor', 'settings', 'general'],
    queryFn: () => generalApi.get(),
  });

  const { data: allSettings } = useQuery({
    queryKey: ['vendor', 'settings', 'all'],
    queryFn: () => settingsApi.get(),
  });

  const serverBannerPath = allSettings?.['branding.social_banner'];
  const serverBannerUrl = typeof serverBannerPath === 'string' && serverBannerPath
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:8000'}/storage/${serverBannerPath}`
    : null;

  useEffect(() => {
    if (store) {
      if (!logoFile && !removeLogoFlag) setLogoPreview(store.logo);
      if (!faviconFile && !removeFaviconFlag) setFaviconPreview(store.favicon);
    }
  }, [store, logoFile, faviconFile, removeLogoFlag, removeFaviconFlag]);

  useEffect(() => {
    if (!bannerFile && !removeBannerFlag) setBannerPreview(serverBannerUrl);
  }, [serverBannerUrl, bannerFile, removeBannerFlag]);

  // Hydrate color pickers from theme.overrides so both branding page and
  // customizer stay in sync.
  useEffect(() => {
    const raw = allSettings?.['theme.overrides'];
    if (typeof raw === 'string' && raw) {
      try {
        const obj = JSON.parse(raw) as { primaryColor?: string; accentColor?: string };
        if (obj.primaryColor) setPrimaryColor(obj.primaryColor);
        if (obj.accentColor)  setAccentColor(obj.accentColor);
      } catch { /* ignore */ }
    }
  }, [allSettings]);

  const handleFile = (kind: 'logo' | 'favicon' | 'banner', file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (kind === 'logo')        { setLogoFile(file);    setLogoPreview(url);    setRemoveLogoFlag(false); }
      else if (kind === 'favicon'){ setFaviconFile(file); setFaviconPreview(url); setRemoveFaviconFlag(false); }
      else                        { setBannerFile(file);  setBannerPreview(url);  setRemoveBannerFlag(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo    = () => { setLogoFile(null);    setLogoPreview(null);    setRemoveLogoFlag(true); };
  const handleRemoveFavicon = () => { setFaviconFile(null); setFaviconPreview(null); setRemoveFaviconFlag(true); };
  const handleRemoveBanner  = () => { setBannerFile(null);  setBannerPreview(null);  setRemoveBannerFlag(true); };

  const updateMutation = useMutation({
    mutationFn: (payload: BrandingUpdatePayload) => brandingApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'general'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      // Refresh the store info that the dynamic favicon hook + storefront
      // header read from, otherwise the freshly uploaded favicon/logo won't
      // show until the next page reload.
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'me'] });
      setLogoFile(null); setFaviconFile(null); setBannerFile(null);
      setRemoveLogoFlag(false); setRemoveFaviconFlag(false); setRemoveBannerFlag(false);
      setColorsDirty(false);
      showBanner('success', 'Branding saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save branding')),
  });

  const hasChanges =
    !!logoFile || !!faviconFile || !!bannerFile ||
    removeLogoFlag || removeFaviconFlag || removeBannerFlag ||
    colorsDirty;

  const handleSave = () => {
    const payload: BrandingUpdatePayload = {};
    if (logoFile)         payload.logo = logoFile;
    if (faviconFile)      payload.favicon = faviconFile;
    if (bannerFile)       payload.social_banner = bannerFile;
    if (removeLogoFlag)   payload.remove_logo = true;
    if (removeFaviconFlag)payload.remove_favicon = true;
    if (removeBannerFlag) payload.remove_social_banner = true;
    if (colorsDirty) {
      payload.primary_color = primaryColor;
      payload.accent_color  = accentColor;
    }
    updateMutation.mutate(payload);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{d.branding.logo}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customize your store logo, favicon, colors, and social banner</p>
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

      {/* Logo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{d.branding.logo}</h3>
        <p className="text-xs text-gray-500 mb-4">{d.branding.logoDesc}</p>
        <div className="flex items-center gap-4">
          <div className="w-40 h-14 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile('logo', e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
              <Upload size={14} /> {d.branding.upload}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
              <X size={14} /> {d.branding.remove}
            </Button>
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{d.branding.favicon}</h3>
        <p className="text-xs text-gray-500 mb-4">{d.branding.faviconDesc}</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
            {faviconPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconPreview} alt="favicon" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">32px</span>
            )}
          </div>
          <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden"
            onChange={(e) => handleFile('favicon', e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => faviconInputRef.current?.click()}>
              <Upload size={14} /> {d.branding.upload}
            </Button>
            {faviconPreview && (
              <Button variant="ghost" size="sm" onClick={handleRemoveFavicon}>
                <X size={14} /> {d.branding.remove}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.branding.colors}</h3>
        <p className="text-xs text-gray-500 mb-4">Used across the storefront — buttons, links, and accents pick these up automatically.</p>
        <div className="flex flex-col gap-3">
          {([
            { label: d.branding.primaryColor, value: primaryColor, set: (v: string) => { setPrimaryColor(v); setColorsDirty(true); } },
            // Accent color is plumbed through the theme provider but not yet
            // consumed by any UI element. Hidden until we wire it up to
            // sale badges, filter chips, etc. State + save logic kept intact
            // so re-enabling is just adding the row back.
          ]).map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex items-center gap-2">
                <label className="relative cursor-pointer">
                  <input type="color" value={value} onChange={(e) => set(e.target.value)} className="sr-only" />
                  <div
                    className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm cursor-pointer"
                    style={{ backgroundColor: value }}
                  />
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-24 h-8 px-2 text-xs font-mono text-gray-600 border border-gray-200 rounded-md focus:border-gray-400 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Share Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.branding.socialBanner}</h3>
        <p className="text-xs text-gray-500 mb-4">{d.branding.socialBannerDesc}</p>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile('banner', e.target.files?.[0] ?? null)} />
        {bannerPreview ? (
          <div className="flex items-start gap-4">
            <div className="w-56 h-28 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerPreview} alt="social banner" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" onClick={() => bannerInputRef.current?.click()}>
                <Upload size={14} /> Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRemoveBanner}>
                <X size={14} /> {d.branding.remove}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Upload size={20} className="text-gray-400" />
            <span className="text-xs text-gray-500">{d.branding.upload}</span>
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending || !hasChanges}>
          {updateMutation.isPending ? 'Saving...' : d.save}
        </Button>
      </div>
    </div>
  );
}
