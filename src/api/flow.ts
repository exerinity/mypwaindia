import { apiFetch } from './client.js';

export function getLeaderboard() {
  return apiFetch('/api/v2/info/leaderboard');
}

export function getTeam() {
  return apiFetch('/api/v2/info/team');
}