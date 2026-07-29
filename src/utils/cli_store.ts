import { storageGet, storageSet, storageRemove } from './storage.ts';

export type LineType = 'cmd' | 'out' | 'ok' | 'err' | 'warn' | 'info' | 'sep';
export interface CliLine { id: number; type: LineType; text: string }

export const CLI_LINES_KEY = 'mpi_cli_lines';
export const CLI_SUDO_SEEN_KEY = 'mpi_cli_sudo_seen';
export const SUDO_TIMEOUT_MS = 15 * 60 * 1000;

const MAX_PERSISTED = 200;
const MAX_HISTORY = 500;

let _lid = 0;
const mk = (type: LineType) => (text: string): CliLine => ({ id: _lid++, type, text });
export const L = {
  cmd: mk('cmd'), out: mk('out'), ok: mk('ok'), err: mk('err'),
  warn: mk('warn'), info: mk('info'),
  sep: (): CliLine => ({ id: _lid++, type: 'sep', text: '' }),
};

let lines: CliLine[] = (() => {
  const saved = storageGet<CliLine[]>(CLI_LINES_KEY, []);
  if (saved.length > 0) _lid = saved.reduce((max, l) => Math.max(max, l.id), 0) + 1;
  return saved;
})();

let cmdHistory: string[] = [];
let sudoGrantedAt: number | null = null;

const subscribers = new Set<() => void>();

function emit() {
  for (const fn of subscribers) fn();
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getLines(): CliLine[] {
  return lines;
}

export function getCmdHistory(): string[] {
  return cmdHistory;
}

export function pushLines(...newLines: CliLine[]): void {
  if (!newLines.length) return;
  lines = [...lines, ...newLines];
  storageSet(CLI_LINES_KEY, lines.slice(-MAX_PERSISTED));
  emit();
}

export function clearLines(): void {
  lines = [];
  storageRemove(CLI_LINES_KEY);
  emit();
}

export function seedWelcome(username: string): void {
  if (lines.length > 0) return;
  pushLines(
    L.ok('Welcome to MyCLiIndia!'),
    L.warn('MyCLiIndia is a UNIX-like command line interface for performing actions on MyPWAIndia. Enjoy!'),
    L.out(`>> Logged in as ${username}@mypayindia - type 'help' to see a list of commands and 'fs' to toggle fullscreen`),
    L.sep(),
  );
}

export function rememberCmd(raw: string): void {
  cmdHistory = [raw, ...cmdHistory.filter(h => h !== raw)].slice(0, MAX_HISTORY);
  emit();
}

export const CLI_DRAWER_OPEN_EVENT = 'mpi-cli-drawer-open';

let pendingDrawerOpen = false;

export function requestDrawerOpen(): void {
  pendingDrawerOpen = true;
  window.dispatchEvent(new Event(CLI_DRAWER_OPEN_EVENT));
}

export function consumeDrawerOpenRequest(): boolean {
  const pending = pendingDrawerOpen;
  pendingDrawerOpen = false;
  return pending;
}

export function isSudoGranted(): boolean {
  return sudoGrantedAt !== null && Date.now() - sudoGrantedAt < SUDO_TIMEOUT_MS;
}

export function touchSudo(): void {
  sudoGrantedAt = Date.now();
}
