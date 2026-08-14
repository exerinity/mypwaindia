import { ApiError } from './client.js';
import { API_BASE } from './config.js';

const DRIVE_BASE = `${API_BASE}/pwa/drive`;

export interface DriveFile {
  created_at: string;
  hash: string;
  modified_at: string;
  path: string;
  share_uuid: string | null;
  size: number;
  trashed_at: string | null;
}

export interface DriveUser {
  mpi: {
    first_name: string;
    last_name: string;
  };
  permissions: number;
  space_available: number;
  space_used: number;
  username: string;
}

export interface SharedDriveFile {
  file: {
    path: string;
    size: number;
  };
  username: string;
}

interface DriveResponse {
  success: boolean;
  code?: number | string;
  error?: number | string;
  message?: string;
}

interface DriveFilesResponse extends DriveResponse {
  files: DriveFile[];
}

interface DriveDownloadResponse extends DriveResponse {
  download_token: string;
}

interface DriveUserResponse extends DriveResponse {
  user: DriveUser;
}

interface DriveFileResponse extends DriveResponse {
  file: DriveFile;
}

interface DriveShareResponse extends DriveResponse {
  share_uuid: string;
}

interface DriveSharedFileResponse extends DriveResponse, SharedDriveFile {}

async function driveJson<T extends DriveResponse>(
  path: string,
  token?: string,
  options: { method?: string; body?: Record<string, unknown> | FormData } = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${DRIVE_BASE}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ApiError(-1, `${message}: ${method} ${path}`, 0);
  }

  let payload: T;
  try {
    payload = await response.json() as T;
  } catch {
    const code = response.ok ? -2 : response.status;
    const message = response.ok
      ? `MyDriveIndia returned non-JSON (HTTP ${response.status})`
      : `MyDriveIndia request failed with HTTP ${response.status}`;
    throw new ApiError(code, message, response.status);
  }

  if (!response.ok || payload.success !== true) {
    throw new ApiError(payload.error ?? payload.code ?? response.status, payload.message ?? 'MyDriveIndia request failed', response.status);
  }
  return payload;
}

function encodeDrivePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export async function listDriveFiles(token: string): Promise<DriveFile[]> {
  const response = await driveJson<DriveFilesResponse>('/files', token);
  return response.files ?? [];
}

export async function getDriveUser(token: string): Promise<DriveUser> {
  const response = await driveJson<DriveUserResponse>('/auth/me', token);
  return response.user;
}

export async function uploadDriveFile(token: string, file: File, filepath: string): Promise<DriveFile> {
  const body = new FormData();
  body.append('file', file);
  body.append('filepath', filepath);
  const response = await driveJson<DriveFileResponse>('/files', token, { method: 'POST', body });
  return response.file;
}

export async function renameDriveFile(token: string, path: string, newPath: string): Promise<void> {
  await driveJson<DriveResponse>('/files/rename', token, {
    method: 'POST',
    body: { path, new_path: newPath },
  });
}

export async function deleteDriveFile(token: string, path: string): Promise<void> {
  await driveJson<DriveResponse>(`/files/${encodeDrivePath(path)}`, token, { method: 'DELETE' });
}

export async function restoreDriveFiles(token: string, files: string[]): Promise<void> {
  await driveJson<DriveResponse>('/files/untrash-files', token, {
    method: 'POST',
    body: { files },
  });
}

export async function shareDriveFile(token: string, path: string): Promise<string> {
  const response = await driveJson<DriveShareResponse>('/share', token, {
    method: 'POST',
    body: { path },
  });
  return response.share_uuid;
}

export async function unshareDriveFile(token: string, shareUuid: string): Promise<void> {
  await driveJson<DriveResponse>(`/share/${encodeURIComponent(shareUuid)}`, token, { method: 'DELETE' });
}

export async function getSharedDriveFile(shareUuid: string): Promise<SharedDriveFile> {
  const response = await driveJson<DriveSharedFileResponse>(`/share/${encodeURIComponent(shareUuid)}`);
  return { file: response.file, username: response.username };
}

export async function getSharedDriveDownloadToken(shareUuid: string, path: string): Promise<string> {
  const response = await driveJson<DriveDownloadResponse>(
    `/share/${encodeURIComponent(shareUuid)}/download?path=${encodeURIComponent(path)}`
  );
  return response.download_token;
}

export async function getDriveDownloadToken(token: string, path: string): Promise<string> {
  const response = await driveJson<DriveDownloadResponse>(`/files/download/${encodeDrivePath(path)}`, token);
  return response.download_token;
}

export function driveDownloadUrl(downloadToken: string, view = false): string {
  return `${DRIVE_BASE}/files/download_token/${encodeURIComponent(downloadToken)}${view ? '?view=1' : '?download=1'}`;
}
