// Lightweight color utilities for rank colors
export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b };
}

export function luminance(r: number, g: number, b: number) {
  // Relative luminance approximation
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function shadeColor(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const nr = clamp(r + Math.round(255 * percent / 100));
  const ng = clamp(g + Math.round(255 * percent / 100));
  const nb = clamp(b + Math.round(255 * percent / 100));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}
