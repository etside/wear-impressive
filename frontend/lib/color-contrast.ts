/**
 * Returns relative luminance (Rec. 709) of a hex color in [0, 1].
 * Returns 1 (treats as light) for unparseable input so we fail safe to
 * the existing dark-text default.
 */
export function relativeLuminance(hex: string): number {
  const cleaned = hex.replace('#', '').trim();
  let h: string;
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    h = cleaned.split('').map((c) => c + c).join('');
  } else if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    h = cleaned;
  } else {
    return 1;
  }
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const r = toLin(parseInt(h.slice(0, 2), 16) / 255);
  const g = toLin(parseInt(h.slice(2, 4), 16) / 255);
  const b = toLin(parseInt(h.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.5;
}

/** Picks readable foreground for a given background color. */
export function contrastText(bg: string): '#ffffff' | '#111827' {
  return isDarkColor(bg) ? '#ffffff' : '#111827';
}

/** Slightly muted version of the contrast color, for secondary nav text. */
export function contrastTextMuted(bg: string): string {
  return isDarkColor(bg) ? 'rgba(255,255,255,0.75)' : '#4b5563';
}
