import type { Env } from './client.js';

export interface AgentRate {
  limit: number;
  used: number;
  remaining: number;
  reset: number;
}

export interface AgentStatus {
  subscribed: boolean;
  plan: string | null;
  model: string;
  rate: AgentRate;
  thread_messages: number;
}

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; args: Record<string, unknown>; phase: 'call' | 'result'; result?: unknown; error?: string }
  | { type: 'confirm'; id: string; name: string; args: Record<string, unknown>; summary: string }
  | { type: 'debug'; payload: string }
  | { type: 'error'; message: string }
  | { type: 'done'; status: string; rate: AgentRate };

export class AgentError extends Error {
  code: string;
  status: number;
  rate?: AgentRate;

  constructor(code: string, status: number, message: string, rate?: AgentRate) {
    super(message);
    this.code = code;
    this.status = status;
    this.rate = rate;
  }
}

async function agentBase(): Promise<string> {
  const { API_BASE } = await import('./config.js');
  return `${API_BASE}/api/pwa/clanker`;
}

const MESSAGES: Record<string, string> = {
  unauthorized: 'Your session is no longer valid - log in again to keep chatting',
  subscription_required: 'Clanker is part of the subscription',
  rate_limited: 'You have used all your messages for now. Come back later!',
  expired: 'That action sat around too long and expired',
};

async function fail(res: Response): Promise<never> {
  const body = await res.json().catch(() => null) as { error?: string; message?: string; rate?: AgentRate } | null;
  const code = body?.error ?? `http_${res.status}`;
  throw new AgentError(code, res.status, MESSAGES[code] ?? body?.message ?? `The agent returned HTTP ${res.status}`, body?.rate);
}

export async function getAgentStatus(token: string): Promise<AgentStatus> {
  const res = await fetch(`${await agentBase()}/status`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) await fail(res);
  return res.json() as Promise<AgentStatus>;
}

export async function resetAgentThread(token: string): Promise<void> {
  const res = await fetch(`${await agentBase()}/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) await fail(res);
}

async function stream(
  path: string,
  token: string,
  body: Record<string, unknown>,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${await agentBase()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) await fail(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf('\n\n');
    while (split !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const name = /^event: (.*)$/m.exec(frame)?.[1]?.trim();
      const payload = /^data: (.*)$/m.exec(frame)?.[1];
      if (name && payload) {
        try {
          onEvent({ type: name, ...JSON.parse(payload) } as AgentEvent);
        } catch {}
      }
      split = buffer.indexOf('\n\n');
    }
  }
}

export function agentChat(
  token: string,
  { message, env }: { message: string; env?: Env },
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return stream('/chat', token, { message, env }, onEvent, signal);
}

export function agentConfirm(
  token: string,
  { id, approve, env }: { id: string; approve: boolean; env?: Env },
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return stream('/confirm', token, { id, approve, env }, onEvent, signal);
}
