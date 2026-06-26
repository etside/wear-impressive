/**
 * Extract dominant / accent colors from an image URL (typically the store logo).
 *
 * Algorithm: downsample the image to 80×80 on a canvas, bucket pixels into
 * coarse RGB bins (16-step quantization), skip near-white / near-black /
 * transparent pixels, then return the most-saturated popular bucket as primary
 * and a sufficiently-different second bucket as accent. Pure client-side;
 * requires the image host to allow CORS (we set crossOrigin="anonymous").
 */

export interface DetectedPalette {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
}

function luminance(r: number, g: number, b: number): number {
  // Rec. 709
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function extractPaletteFromImage(url: string): Promise<DetectedPalette | null> {
  if (typeof document === 'undefined') return null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';

  const loaded = new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });

  img.src = url;
  const ok = await loaded;
  if (!ok) return null;

  const size = 80;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0, size, size);
  } catch {
    // CORS taint or other canvas failure.
    return null;
  }

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, size, size);
  } catch {
    return null;
  }

  // Bucket into 16-step RGB bins, ignoring pixels close to white/black/grey and transparent.
  const bins = new Map<string, { r: number; g: number; b: number; count: number; sat: number }>();
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    const a = data.data[i + 3];
    if (a < 200) continue;                   // mostly transparent
    const lum = luminance(r, g, b);
    if (lum > 240) continue;                 // too close to white
    if (lum < 15) continue;                  // too close to black
    const sat = saturation(r, g, b);
    if (sat < 0.12) continue;                // too greyscale
    const qr = r & 0xF0;
    const qg = g & 0xF0;
    const qb = b & 0xF0;
    const key = `${qr}-${qg}-${qb}`;
    const existing = bins.get(key);
    if (existing) {
      existing.count++;
    } else {
      bins.set(key, { r: qr + 8, g: qg + 8, b: qb + 8, count: 1, sat });
    }
  }

  if (bins.size === 0) return null;

  // Rank by count × saturation^0.4 so we don't pick dull popular colors.
  const ranked = Array.from(bins.values())
    .sort((a, b) => (b.count * Math.pow(b.sat, 0.4)) - (a.count * Math.pow(a.sat, 0.4)));

  const primary = ranked[0];
  const primaryTriple: [number, number, number] = [primary.r, primary.g, primary.b];

  // Accent: first candidate with meaningful distance from primary and different hue feel.
  const accent = ranked.slice(1).find(c => {
    const d = colorDistance(primaryTriple, [c.r, c.g, c.b]);
    return d > 80;
  }) ?? ranked[Math.min(1, ranked.length - 1)];

  const primaryHex = rgbToHex(primary.r, primary.g, primary.b);
  const accentHex  = rgbToHex(accent.r,  accent.g,  accent.b);

  // Pick text color based on primary darkness so labels stay readable against a
  // primary-colored header: dark primary → light bg, dark text; light primary →
  // same default light bg, dark text. Background stays white unless the logo is
  // overwhelmingly dark-on-dark (rare), in which case we keep white for safety.
  return {
    primary: primaryHex,
    accent:  accentHex,
    background: '#ffffff',
    text: luminance(primary.r, primary.g, primary.b) < 80 ? '#111827' : '#111827',
  };
}
