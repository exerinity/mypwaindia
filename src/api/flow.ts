export async function getLeaderboard() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/info/leaderboard?limit=67');
}

export async function getTeam() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/info/team');
}

export async function getNews() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/pwa/meta/news');
}