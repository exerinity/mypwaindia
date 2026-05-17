export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function calcAge(iso) {
  if (!iso) return null;
  const birth = new Date(iso);
  if (isNaN(birth)) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, weeks: Math.floor(days / 7), days: days % 7 };
}

export function formatRelative(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const diffSec = (Date.now() - d.getTime()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'just now';
  if (abs < 3600) return `${Math.floor(abs / 60)}m ago`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ago`;
  if (abs < 86400 * 30) return `${Math.floor(abs / 86400)}d ago`;
  return formatDateShort(iso);
}
