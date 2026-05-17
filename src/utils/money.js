export function formatPaisa(paisa) {
  if (paisa === null || paisa === undefined || isNaN(paisa)) return '0.00';
  const sign = paisa < 0 ? '-' : '';
  const abs = Math.abs(Number(paisa));
  const rupees = Math.floor(abs / 100);
  const fractional = abs % 100;
  return `${sign}${rupees.toLocaleString('en-US')}.${String(fractional).padStart(2, '0')}`;
}

export function formatINR(paisa) {
  return `${formatPaisa(paisa)} INR`;
}

export function formatMoney(paisa, symbol = '$') {
  return `${symbol}${formatPaisa(paisa)}`;
}

export function rupeesToPaisa(rupeesString) {
  const s = String(rupeesString).trim();
  if (!s) return 0;
  if (!/^-?\d+(\.\d{0,2})?$/.test(s)) return NaN;
  const [whole, frac = ''] = s.split('.');
  const padded = (frac + '00').slice(0, 2);
  const negative = whole.startsWith('-');
  const wholeAbs = whole.replace('-', '');
  const total = parseInt(wholeAbs, 10) * 100 + parseInt(padded, 10);
  return negative ? -total : total;
}