export function normalizeHex(hex) {
  if (!hex) return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function darken(hex, amount = 0.15) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(f(rgb.r))}${toHex(f(rgb.g))}${toHex(f(rgb.b))}`;
}

export function isLight(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.65;
}