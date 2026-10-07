import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

export const profile_platforms = ['website', 'x', 'bluesky', 'mastodon', 'discord', 'github', 'youtube', 'twitch', 'instagram', 'tiktok', 'reddit', 'telegram'] as const;
export const section_types = ['shop', 'stats', 'revenue_chart', 'recent_sales', 'top_items', 'supporters', 'goal', 'updates', 'faq', 'text'] as const;
export const pride_flags = ['rainbow', 'trans', 'bisexual', 'pansexual', 'nonbinary', 'lesbian', 'mlm', 'asexual', 'genderfluid', 'aromantic', 'agender', 'intersex'] as const;
export const avatar_accessories = ['cat_ears_black', 'cat_ears_white', 'cat_ears_orange', 'cat_ears_gray'] as const;
export const profile_accents = ['brand', 'rose', 'amber', 'green', 'teal', 'blue', 'violet', 'slate'] as const;
export type PrideFlag = typeof pride_flags[number];
export type AvatarAccessory = typeof avatar_accessories[number];
export type ProfileAccent = typeof profile_accents[number];
export type StatusExpiry = '1h' | '1d' | '1w' | 'never';
export interface ProfileStatus { emoji: string; text: string; expires_at: string | null }
export interface RatingSummary { average: number; count: number }
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
  pronouns?: string | null;
  pride_flags?: PrideFlag[] | null;
  avatar_flag?: PrideFlag | '' | null;
  avatar_accessory?: AvatarAccessory | '' | null;
  country?: string | null;
  country_name?: string | null;
  accent?: ProfileAccent | null;
  status?: ProfileStatus | null;
  verified?: boolean;
  badges?: string[] | null;
  followers?: number | null;
  following?: boolean | null;
  blocked?: boolean | null;
  seller_rating?: RatingSummary | null;
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
  pronouns?: string;
  pride_flags?: PrideFlag[];
  avatar_flag?: PrideFlag | '';
  avatar_accessory?: AvatarAccessory | '';
  country?: string;
  accent?: ProfileAccent;
  status_emoji?: string;
  status_text?: string;
  status_expiry?: StatusExpiry;
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
  score?: number;
  vote?: 1 | -1 | 0 | null;
  created?: string;
}

export interface DiscoverProfile {
  username: string;
  url: string;
  avatar_url?: string | null;
  avatar_flag?: PrideFlag | null;
  avatar_accessory?: AvatarAccessory | null;
  pride_flags?: PrideFlag[] | null;
  country?: string | null;
  country_name?: string | null;
  country_flag?: string | null;
  pronouns?: string | null;
  status?: ProfileStatus | null;
  bio?: string | null;
  followers: number;
  listed_items: number;
  verified: boolean;
}

export function get_public_profile(username: string, auth: Partial<AuthOpts> = {}) {
  return apiFetch<Profile>('/api/v2/profile/get', { ...auth, query: { username } });
}

export function discover_profiles(auth: Partial<AuthOpts> = {}, options: { q?: string; verified?: boolean; following?: boolean; page?: number } = {}) {
  return apiFetch<{ profiles: DiscoverProfile[]; page: number; last_page: number }>('/api/v2/profile/discover', {
    ...auth,
    query: {
      ...(options.q ? { q: options.q } : {}),
      ...(options.verified ? { verified: '1' } : {}),
      ...(options.following ? { tab: 'following' } : {}),
      ...(options.page && options.page > 1 ? { page: String(options.page) } : {}),
    },
  });
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

export function vote_profile_update(auth: AuthOpts, id: number, value: 1 | -1) {
  return apiFetch<{ vote: 1 | -1 | 0; score: number }>('/api/v2/profile/updates/vote', {
    ...auth, method: 'POST', body: { id, value },
  });
}

export function follow_profile(auth: AuthOpts, username: string) {
  return apiFetch<{ following: boolean; followers: number }>('/api/v2/profile/follow', { ...auth, method: 'POST', body: { username } });
}

export function block_profile(auth: AuthOpts, username: string) {
  return apiFetch<{ blocked: boolean }>('/api/v2/profile/block', { ...auth, method: 'POST', body: { username } });
}

export interface ProfileDonation {
  transaction_id: string;
  status: 'confirmed' | 'pending';
  amount: number;
  public: boolean;
}

export function report_profile(auth: AuthOpts, username: string, reason: ReportReason, 
  details: string) {
  return apiFetch<{ id: number }>('/api/v2/profile/report', {
    ...auth, method: 'POST', body: { username, reason, ...(details.trim() ? { details: details.trim() } : {}) },
  });
}
