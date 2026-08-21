import type { AuthOpts } from './client.js';

export interface AgentIdentity {
  name: string;
  short_name: string;
  avatar: string;
}

export interface AgentStep {
  status: string;
  label: string;
  description: string;
  note: string | null;
}

export interface PaymentLinkAgentCard {
  token: string;
  amount: number;
  note: string | null;
  status: string;
  created: string;
  url: string;
}

export interface TransactionAgentCard {
  id: string;
  reference: string;
  other_party: string;
  sent: boolean;
  amount: number;
  status: string;
  created: string;
}

export interface WeatherAgentCard {
  place: string;
  flag: string;
  label: string;
  icon: string | number;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind?: number;
  days?: WeatherAgentDay[];
}

export interface WeatherAgentDay {
  date: string;
  label: string;
  icon: string | number;
  high: number;
  low: number;
}

export type AgentCard = PaymentLinkAgentCard | TransactionAgentCard | WeatherAgentCard;

export interface AgentResult {
  ok: boolean;
  message: string;
  writes: boolean;
  kind: 'payment-links' | 'transactions' | 'weather' | null;
  cards: AgentCard[];
}

export interface AgentMessage {
  role: 'user' | 'agent';
  text: string;
  confirmable?: boolean;
  steps?: AgentStep[];
  results?: AgentResult[];
}

export interface AgentState {
  agent?: AgentIdentity;
  max_length?: number;
  greeting: string;
  transcript: AgentMessage[];
  awaiting_confirmation: boolean;
  awaiting_answer: boolean;
  suggestions: string[];
  reply?: AgentMessage[];
}

export async function getAgentState({ token, env }: AuthOpts): Promise<AgentState> {
  const { apiFetch } = await import('./client.js');
  return apiFetch<AgentState>('/api/v2/agent/state', { token, env });
}

export async function sendAgentMessage({ token, env }: AuthOpts, message: string): Promise<AgentState> {
  const { apiFetch } = await import('./client.js');
  return apiFetch<AgentState>('/api/v2/agent/message', {
    method: 'POST',
    token,
    env,
    body: { message },
  });
}

export async function confirmAgentAction({ token, env }: AuthOpts): Promise<AgentState> {
  const { apiFetch } = await import('./client.js');
  return apiFetch<AgentState>('/api/v2/agent/confirm', { method: 'POST', token, env });
}

export async function declineAgentAction({ token, env }: AuthOpts): Promise<AgentState> {
  const { apiFetch } = await import('./client.js');
  return apiFetch<AgentState>('/api/v2/agent/decline', { method: 'POST', token, env });
}

export async function resetAgentConversation({ token, env }: AuthOpts): Promise<AgentState> {
  const { apiFetch } = await import('./client.js');
  return apiFetch<AgentState>('/api/v2/agent/reset', { method: 'POST', token, env });
}
