import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

export const profile_platforms = ['website', 'x', 'bluesky', 'mastodon', 'discord', 'github', 'youtube', 'twitch', 'instagram', 'tiktok', 'reddit', 'telegram'] as const;
export const section_types = ['shop', 'stats', 'revenue_chart', 'recent_sales', 'top_items', 'supporters', 'updates', 'faq', 'text'] as const;
export type ProfilePlatform = typeof profile_platforms[number];
export type SectionType = typeof section_types[number];
export type ReportReason = 'scam' | 'impersonation' | 'inappropriate' | 'spam' | 'other';

export interface ProfileLink {
  platform: ProfilePlatform;
  label?: string;
  url: string;
}

export interface ProfileSection {
  type: SectionType;
  title?: string;
  visible: boolean;
  config: Record<string, unknown>;
}

export interface Profile {
  username: string | null;
  url?: string | null;
  visibility: string | null;
  locked?: boolean;
  private?: boolean;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  balance?: number | null;
  balance_visible?: boolean;
  links?: ProfileLink[] | null;
  sections: ProfileSection[] | null;
  member_since?: string | null;
}

export interface ProfilePatch {
  bio?: string;
  visibility?: 'public' | 'private';
  balance_visible?: boolean;
  links?: Pick<ProfileLink, 'platform' | 'url'>[];
  layout?: ProfileSection[];
}

export interface ProfileUpdate {
  id: number;
  body: string;
  image_url?: string | null;
  link?: string | null;
  likes: number;
  liked: boolean | null;
  created?: string;
}

export function get_public_profile(username: string, auth: Partial<AuthOpts> = {}) {
  return apiFetch<Profile>('/api/v2/profile/get', { ...auth, query: { username } });
}

export function get_my_profile(auth: AuthOpts) {
  return apiFetch<Profile>('/api/v2/profile/me', auth);
}

export function update_profile(auth: AuthOpts, body: ProfilePatch) {
  return apiFetch<Partial<Profile>>('/api/v2/profile/update', { ...auth, method: 'POST', body });
}

export function list_profile_updates(username: string, auth: Partial<AuthOpts> = {}, limit = 20) {
  return apiFetch<{ updates: ProfileUpdate[] }>('/api/v2/profile/updates/list', {
    ...auth, query: { username, limit: String(Math.min(50, Math.max(1, limit))) },
  });
}

export function create_profile_update(auth: AuthOpts, body: string, link?: string) {
  return apiFetch<ProfileUpdate>('/api/v2/profile/updates/create', {
    ...auth, method: 'POST', body: { body, ...(link ? { link } : {}) },
  });
}

export function delete_profile_update(auth: AuthOpts, id: number) {
  return apiFetch('/api/v2/profile/updates/delete', { ...auth, method: 'POST', body: { id } });
}

export function like_profile_update(auth: AuthOpts, id: number) {
  return apiFetch<{ liked: boolean; likes: number }>('/api/v2/profile/updates/like', {
    ...auth, method: 'POST', body: { id },
  });
}

export function report_profile(auth: AuthOpts, username: string, reason: ReportReason, 
  details: string) {
  return apiFetch<{ id: number }>('/api/v2/profile/report', {
    ...auth, method: 'POST', body: { username, reason, ...(details.trim() ? { details: details.trim() } : {}) },
  });
}
