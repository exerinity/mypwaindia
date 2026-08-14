export type PreviewKind = 'audio' | 'image' | 'video';

const AUDIO_EXTENSIONS = new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'weba']);
const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['m4v', 'mov', 'mp4', 'ogv', 'webm']);

function encodeDriveRoutePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function drivePreviewRoute(path: string): string {
  return `/i/flow/file/${encodeDriveRoutePath(path)}`;
}

export function sharedDrivePreviewRoute(uuid: string, path: string): string {
  return `${drivePreviewRoute(path)}?share=${encodeURIComponent(uuid)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; value >= 1024 && i < units.length; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

export function fileName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

export function formatDriveDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function previewKind(path: string): PreviewKind | null {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return null;
}

export function drivePathError(path: string): string | null {
  const value = path.trim();
  if (!value) return 'Enter a file path!';
  if (value.startsWith('/')) return 'File paths must be relative!';
  const parts = value.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return 'File paths cannot contain empty or dot segments!';
  return null;
}
