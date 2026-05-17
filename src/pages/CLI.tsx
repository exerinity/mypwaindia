import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { Account } from '../context/AuthContext.tsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { transfer, listTransactions, getTransaction } from '../api/transactions.js';
import { createLink, listLinks, cancelLink, claimLink, getLink } from '../api/links.js';
import { getUserInfo, getRestrictions, listSessions, invalidateSession, verifyEmail } from '../api/user.js';
import { getLeaderboard, getTeam } from '../api/info.js';
import { rupeesToPaisa, formatINR } from '../utils/money.js';
import { formatDate, formatRelative } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { storageGet, storageSet, storageRemove, KEYS } from '../utils/storage.ts';
import '../styles/cli.css';

type LineType = 'cmd' | 'out' | 'ok' | 'err' | 'warn' | 'info' | 'sep';
interface CliLine { id: number; type: LineType; text: string }
type ApiAny = any;

const CLI_LINES_KEY = 'mpi_cli_lines';
const CLI_SUDO_SEEN_KEY = 'mpi_cli_sudo_seen';
const SUDO_TIMEOUT_MS = 15 * 60 * 1000;

function tokenize(raw: string): string[] {
  const tokens = [];
  let cur = '';
  let inQ = false;
  let qc = '';
  for (const ch of raw) {
    if (inQ) {
      if (ch === qc) { inQ = false; tokens.push(cur); cur = ''; }
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      if (cur) { tokens.push(cur); cur = ''; }
      inQ = true; qc = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (cur) { tokens.push(cur); cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

let _lid = 0;
const mk = (type: LineType) => (text: string): CliLine => ({ id: _lid++, type, text });
const L = {
  cmd: mk('cmd'), out: mk('out'), ok: mk('ok'), err: mk('err'),
  warn: mk('warn'), info: mk('info'),
  sep: (): CliLine => ({ id: _lid++, type: 'sep', text: '' }),
};

const COMMANDS = [
  'balance', 'bal',
  'info', 'whoami',
  'transfer', 'send',
  'link',
  'links',
  'cancel',
  'claim', 'inspect',
  'history', 'txns',
  'tx',
  'leaderboard', 'lb',
  'team',
  'sessions',
  'invalidate',
  'restrictions',
  'verify-email',
  'go', 'nav', 'goto', 'cd',
  'clear', 'cls',
  'logout',
  'help',
  'sudo',
  'accounts', 'account', 'acc',
];

const PAGE_MAP = {
  dash: '/dash', home: '/dash', dashboard: '/dash',
  account: '/dash/account',
  transfer: '/dash/account/transfer', send: '/dash/account/transfer',
  history: '/dash/account/history',
  links: '/dash/links',
  claim: '/dash/links/claim',
  settings: '/settings',
  leaderboard: '/i/leaderboard', lb: '/i/leaderboard',
  team: '/i/team',
  notes: '/i/release_notes', releases: '/i/release_notes',
  cli: '/i/flow/mci',
  acknowledgements: '/i/acknowledgements',
};

const HELP = [
  '  balance / bal                    show your current balance',
  '  info / whoami                    show account info',
  '  transfer <amt> <user> [note]     send INR to a user',
  '  link <amt> [note]                create a payment link',
  '  links [active|past|all]          list your payment links',
  '  inspect <token>                  preview a payment link',
  '  claim <token>                    claim a payment link',
  '  cancel <token>                   cancel an active payment link',
  '  history [n]                      show last n transactions (default 10)',
  '  tx <id>                          show a transaction by ID',
  '  leaderboard / lb                 show the leaderboard',
  '  team                             show the team',
  '  sessions                         list your active sessions',
  '  invalidate <session_id>          terminate a session',
  '  restrictions                     show account restrictions',
  '  verify-email                     send email verification',
  '  go <page>                        navigate to a page',
  `    pages: ${Object.keys(PAGE_MAP).join(', ')}`,
  '  accounts / acc list              list saved accounts and their bay IDs',
  '  accounts / acc switch <bay>      switch to account in that bay',
  '  accounts / acc remove <bay>      remove account from that bay  [sudo]',
  '  accounts / acc add <username>    add an account (prompts for password)  [sudo]',
  '  accounts / acc move <from> <to>  move account from one bay to another',
  '  sudo <command>                   run a command with elevated privileges',
  '  clear / cls                      clear the terminal',
  '  logout                           sign out',
  '  help                             show this help',
];

const HELP_TIPS = [
  '  [sudo] commands (acc add, acc remove, send >₹2000) require your password',
  '  sudo access is cached for 15 minutes - prefix any command with sudo',
  '',
  '  commands can be chained using &&',
  '  wrap multi-word args in "quotes"',
  '  arrow up/down: command history - tab: autocomplete',
];

export default function CLIPage() {
  usePageTitle('MyCLiIndia');
  const { active, accounts, activeId, login, removeAccount, switchAccount } = useAuth();
  const navigate = useNavigate();

  const username = active?.username ?? 'guest';

  const [lines, setLines] = useState<CliLine[]>(() => {
    const saved = storageGet<CliLine[]>(CLI_LINES_KEY, []);
    if (saved.length > 0) {
      _lid = saved.reduce((max, l) => Math.max(max, l.id), 0) + 1;
      return saved;
    }
    return [
      L.ok('Welcome to MyCLiIndia!'),
      L.out(`logged in as ${username}@mypayindia - type 'help' to see a list of commands`),
      L.sep(),
    ];
  });

  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [promptMode, setPromptMode] = useState<'none' | 'password' | 'text'>('none');

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const histBuf = useRef<string>('');
  const busyRef = useRef<boolean>(false);
  const pendingPromptRef = useRef<((val: string) => void) | null>(null);
  const sudoGrantedAt = useRef<number | null>(null);

  useEffect(() => {
    storageSet(CLI_LINES_KEY, lines.slice(-200));
  }, [lines]);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement === inputRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return;
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleWrapClick(e: React.MouseEvent) {
    if (window.getSelection()?.toString()) return;
    if (e.target !== inputRef.current) inputRef.current?.focus();
  }

  const push = useCallback((...newLines: CliLine[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  function requireLogin(): boolean {
    if (!active) {
      push(L.warn('Log in to access that!'));
      return false;
    }
    return true;
  }

  function promptInput(hide: boolean): Promise<string> {
    return new Promise((resolve) => {
      setPromptMode(hide ? 'password' : 'text');
      pendingPromptRef.current = resolve;
    });
  }

  function promptPassword() { return promptInput(true); }
  function promptText() { return promptInput(false); }

  function isSudoGranted(): boolean {
    const now = Date.now();
    return sudoGrantedAt.current !== null && now - sudoGrantedAt.current < SUDO_TIMEOUT_MS;
  }

  async function grantSudo(): Promise<boolean> {
    if (isSudoGranted()) {
      sudoGrantedAt.current = Date.now();
      return true;
    }

    const hasSeen = storageGet<boolean>(CLI_SUDO_SEEN_KEY, false);
    if (!hasSeen) {
      push(
        L.warn(''),
        L.warn('We trust you have received the usual lecture from the local System'),
        L.warn('Administrator. It usually boils down to these three things:'),
        L.warn(''),
        L.warn('    #1) Respect the privacy of others.'),
        L.warn('    #2) Think before you type.'),
        L.warn('    #3) With great power comes great responsibility.'),
        L.warn(''),
      );
      storageSet(CLI_SUDO_SEEN_KEY, true);
    }

    if (!active?.password) {
      push(L.err('sudo: credentials for this account are not stored'));
      return false;
    }

    push(L.out(`[sudo] password for ${username}: `));
    const pw = await promptPassword();

    if (!pw) {
      push(L.err('sudo: no password entered'));
      return false;
    }

    if (pw !== active.password) {
      push(L.err('sudo: incorrect password'));
      return false;
    }

    sudoGrantedAt.current = Date.now();
    return true;
  }

  function needsSudo(hint: string): boolean {
    if (isSudoGranted()) {
      sudoGrantedAt.current = Date.now();
      return true;
    }
    push(L.err(`Permission denied. Try: sudo ${hint}`));
    return false;
  }

  function handleClearAll() {
    setLines([]);
    storageRemove(CLI_LINES_KEY);
  }

  async function runCmd(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const tokens = tokenize(trimmed);
    if (!tokens.length) return;
    const [cmd, ...args] = tokens;
    const c = cmd.toLowerCase();

    switch (c) {

      case 'clear':
      case 'cls':
        setLines([]);
        storageRemove(CLI_LINES_KEY);
        return;

      case 'help':
        push(L.info('list of commands:'), ...HELP.map(L.out), L.out(''), ...HELP_TIPS.map(L.info));
        return;

      case 'sudo': {
        if (!requireLogin()) return;
        if (!args.length) {
          push(L.err('usage: sudo <command> [args...]'));
          push(L.out('  e.g. sudo acc remove 1'));
          push(L.out('  e.g. sudo acc add username'));
          push(L.out('  e.g. sudo send 5000 someone'));
          return;
        }
        const sudoCmd = args[0].toLowerCase();
        const sudoSub = args[1]?.toLowerCase();
        const needsSudoCmd =
          (sudoCmd === 'send' || sudoCmd === 'transfer') ||
          ((sudoCmd === 'acc' || sudoCmd === 'account' || sudoCmd === 'accounts') &&
            (sudoSub === 'remove' || sudoSub === 'rm' || sudoSub === 'add'));
        if (!needsSudoCmd) {
          push(L.warn('You should not run this command with sudo!'));
        }
        const granted = await grantSudo();
        if (!granted) return;
        await runCmd(args.join(' '));
        return;
      }

      case 'balance':
      case 'bal': {
        if (!requireLogin()) return;
        const info = await getUserInfo(active!) as ApiAny;
        push(L.ok(`${formatINR(info.balance)}`));
        return;
      }

      case 'info':
      case 'whoami': {
        if (!requireLogin()) return;
        const info = await getUserInfo(active!) as ApiAny;
        push(
          L.out(`username:  ${info.username}`),
          L.out(`name:      ${info.first_name} ${info.last_name}`),
          L.out(`email:     ${info.email}`),
          L.out(`balance:   ${formatINR(info.balance)}`),
          L.out(`2FA:       ${info.mfa_enabled ? 'enabled' : 'disabled'}`),
          L.out(`role:      ${info.role}`),
          L.out(`joined:    ${formatDate(info.created)}`),
        );
        return;
      }

      case 'transfer':
      case 'send': {
        if (!requireLogin()) return;
        const [amtStr, recipient, note] = args;
        if (!amtStr || !recipient) {
          push(L.err(`usage: transfer <amount> <recipient> [note]`)); return;
        }
        const paisa = rupeesToPaisa(amtStr);
        if (!Number.isInteger(paisa) || paisa <= 0) {
          push(L.err(`invalid amount: "${amtStr}" - use e.g. 55 or 55.50`)); return;
        }
        if (paisa > 200000) {
          if (!needsSudo(`send ${amtStr} ${recipient}${note ? ` "${note}"` : ''}`)) return;
        }
        const res = await transfer(active!, {
          recipient,
          amount: paisa,
          ...(note ? { note } : {}),
        }) as ApiAny;
        push(L.ok(`sent ${formatINR(paisa)} to ${recipient}`));
        if (note) push(L.out(`note: "${note}"`));
        push(L.out(`tx id: ${res.transaction_id}`));
        return;
      }

      case 'link': {
        if (!requireLogin()) return;
        const [amtStr, note] = args;
        if (!amtStr) {
          push(L.err(`usage: link <amount> [note]`)); return;
        }
        const paisa = rupeesToPaisa(amtStr);
        if (!Number.isInteger(paisa) || paisa <= 0) {
          push(L.err(`invalid amount: "${amtStr}"`)); return;
        }
        const lnk = await createLink(active!, {
          amount: paisa,
          ...(note ? { note } : {}),
        }) as ApiAny;
        push(L.ok(`link created - ${formatINR(paisa)}`));
        if (note) push(L.out(`note: "${note}"`));
        push(L.out(`token: ${lnk.token}`));
        push(L.out(`link:   ${lnk.url}`));
        try {
          await navigator.clipboard.writeText(lnk.url);
          push(L.info('copied link'));
        } catch {}
        return;
      }

      case 'links': {
        if (!requireLogin()) return;
        const filter = (args[0] ?? 'all').toLowerCase();
        const data = await listLinks(active!) as ApiAny;
        let arr: ApiAny[] = data.links ?? [];
        if (filter === 'active') arr = arr.filter((l: ApiAny) => l.status === 'active');
        else if (filter === 'past') arr = arr.filter((l: ApiAny) => l.status !== 'active');

        if (!arr.length) {
          push(L.out(`no ${filter === 'all' ? '' : filter + ' '}links found`));
          return;
        }
        push(L.out(`${arr.length} link(s):`));
        for (const l of arr) {
          const statusColor = l.status === 'active' ? 'ok' : l.status === 'claimed' ? 'info' : 'warn';
          push(
            L[statusColor](`  ${formatINR(l.amount).padEnd(14)} [${l.status}]  ${l.token}`),
            ...(l.note ? [L.out(`    note: "${l.note}"`)] : []),
            L.out(`    ${formatRelative(l.created)}`),
          );
        }
        return;
      }

      case 'inspect': {
        const [token] = args;
        if (!token) { push(L.err('usage: inspect <token>')); return; }
        const lnk = await getLink(token) as ApiAny;
        push(
          L.out(`from:    @${lnk.creator?.username}`),
          L.out(`amount:  ${formatINR(lnk.amount)}`),
          L.out(`status:  ${lnk.status}`),
          L.out(`created: ${formatDate(lnk.created)}`),
          ...(lnk.note ? [L.out(`note:    "${lnk.note}"`)] : []),
        );
        return;
      }

      case 'claim': {
        if (!requireLogin()) return;
        const [token] = args;
        if (!token) { push(L.err('Usage: claim <token>')); return; }
        const res = await claimLink(active!, token) as ApiAny;
        push(L.ok(`claimed ${formatINR(res.amount ?? 0)}!`));
        push(L.out(`tx id: ${res.transaction_id}`));
        return;
      }

      case 'cancel': {
        if (!requireLogin()) return;
        const [token] = args;
        if (!token) { push(L.err('usage: cancel <token>')); return; }
        await cancelLink(active!, token);
        push(L.ok(`link ${token} cancelled and refunded`));
        return;
      }

      case 'history':
      case 'txns': {
        if (!requireLogin()) return;
        const n = parseInt(args[0] ?? '10', 10);
        const count = (isNaN(n) || n <= 0) ? 10 : Math.min(n, 200);
        const data = await listTransactions(active!) as ApiAny;
        const txns = (data.transactions ?? []).slice(0, count);
        if (!txns.length) {
          push(L.out('there is nothing to show')); return;
        }
        push(L.out(`last ${txns.length} transaction(s):`));
        for (const t of txns) {
          const isSender = t.sender?.username === username;
          const dir = isSender
            ? `> ${t.recipient?.username}`
            : `< ${t.sender?.username}`;
          const amtStr = formatINR(t.amount).padEnd(14);
          push(
            isSender
              ? L.out(`  #${String(t.id).padEnd(6)} ${amtStr} ${dir.padEnd(24)} ${formatRelative(t.created)}`)
              : L.ok(`  #${String(t.id).padEnd(6)} ${amtStr} ${dir.padEnd(24)} ${formatRelative(t.created)}`),
            ...(t.note ? [L.out(`    "${t.note}"`)] : []),
          );
        }
        return;
      }

      case 'tx': {
        if (!requireLogin()) return;
        const [id] = args;
        if (!id) { push(L.err('usage: tx <transaction_id>')); return; }
        const t = await getTransaction(active!, id) as ApiAny;
        push(
          L.out(`tx id:   ${t.transaction_id}`),
          L.out(`amount:  ${formatINR(t.amount)}`),
          L.out(`from:    @${t.sender?.username}`),
          L.out(`to:      @${t.recipient?.username}`),
          L.out(`status:  ${t.status}`),
          L.out(`date:    ${formatDate(t.created)}`),
          ...(t.note ? [L.out(`note:    "${t.note}"`)] : []),
        );
        return;
      }

      case 'leaderboard':
      case 'lb': {
        const data = await getLeaderboard() as ApiAny;
        const board = data.leaderboard ?? [];
        if (!board.length) { push(L.out('there is nothing to show')); return; }
        push(L.info('leaderboard:'));
        board.slice(0, 25).forEach((u: ApiAny, i: number) => {
          const isSelf = u.username === username;
          const line = `  ${String(i + 1).padStart(2)}.  ${('@' + u.username).padEnd(22)}  ${formatINR(u.balance)}`;
          push(isSelf ? L.ok(line + '  (you)') : L.out(line));
        });
        return;
      }

      case 'team': {
        const data = await getTeam() as ApiAny;
        const members = data.team ?? data.members ?? data ?? [];
        if (!Array.isArray(members) || !members.length) {
          push(L.out('there is nothing to show')); return;
        }
        push(L.info('listing team members...'));
        for (const m of members) {
          push(L.out(`  ${(m.name ?? m.username ?? '?').padEnd(24)}  ${m.role ?? ''}`));
        }
        return;
      }

      case 'sessions': {
        if (!requireLogin()) return;
        const data = await listSessions(active!) as ApiAny;
        const sessions = data.sessions ?? [];
        if (!sessions.length) { push(L.out('there is nothing to show')); return; }
        push(L.out(`${sessions.length} session(s):`));
        for (const s of sessions) {
          const sid = s.session_id ?? s.id;
          const isCurrent = s.current;
          push(
            isCurrent ? L.ok(`  ${sid}  (current)`) : L.out(`  ${sid}`),
            L.out(`    device: ${s.device_info || 'unknown'}  IP: ${s.ip ?? 'unknown'}`),
            L.out(`    created: ${formatDate(s.created_at)}  Last active: ${formatRelative(s.last_active)}`),
          );
        }
        return;
      }

      case 'invalidate': {
        if (!requireLogin()) return;
        const [sid] = args;
        if (!sid) { push(L.err('usage: invalidate <session_id>')); return; }
        await invalidateSession(active!, sid);
        push(L.ok(`ok`));
        return;
      }

      case 'restrictions': {
        if (!requireLogin()) return;
        const data = await getRestrictions(active!) as ApiAny;
        const entries = Object.entries(data?.restrictions ?? {}) as [string, ApiAny][];
        if (!entries.length) { push(L.ok('there is nothing to show')); return; }
        let any = false;
        for (const [key, val] of entries) {
          if (val?.active) {
            any = true;
            push(L.warn(`  ${key}: ACTIVE${val.expires_at ? ` - expires ${formatDate(val.expires_at as string)}` : ''}`));
          } else {
            push(L.out(`  ${key}: inactive`));
          }
        }
        if (!any) push(L.ok('there is nothing to show'));
        return;
      }

      case 'verify-email': {
        if (!requireLogin()) return;
        await verifyEmail(active!);
        push(L.ok('ok'));
        return;
      }

      case 'go':
      case 'nav':
      case 'goto':
      case 'cd': {
        const [page] = args;
        if (!page) {
          push(L.out(`pages: ${Object.keys(PAGE_MAP).join(', ')}`)); return;
        }
        const path = PAGE_MAP[page.toLowerCase() as keyof typeof PAGE_MAP];
        if (!path) {
          push(L.err(`unknown page: "${page}". available: ${Object.keys(PAGE_MAP).join(', ')}`)); return;
        }
        push(L.info(`> ${path}`));
        navigate(path);
        return;
      }

      case 'logout':
        if (!requireLogin()) return;
        push(L.info('ok'));
        setTimeout(() => navigate('/i/flow/logout'), 350);
        return;

      case 'accounts':
      case 'account':
      case 'acc': {
        const [sub, ...subArgs] = args;
        switch (sub?.toLowerCase()) {
          case 'list':
          case 'ls': {
            if (!accounts.length) { push(L.out('no accounts saved')); return; }
            for (let i = 0; i < accounts.length; i++) {
              const a = accounts[i];
              const isActive = a.id === activeId;
              const tag = [a.role, a.env === 'staging' ? 'staging' : ''].filter(Boolean).join(', ');
              const line = `  bay ${i + 1}  @${a.username.padEnd(20)} ${tag}${isActive ? '  (active)' : ''}`;
              push(isActive ? L.ok(line) : L.out(line));
            }
            push(L.info('switch to any of these using acc switch <bay>'));
            return;
          }
          case 'switch':
          case 'sw': {
            const bay = parseInt(subArgs[0], 10);
            if (!subArgs[0] || isNaN(bay) || bay < 1 || bay > accounts.length) {
              push(L.err(`usage: acc switch <bay>  (1–${accounts.length})`)); return;
            }
            const target = accounts[bay - 1];
            if (target.id === activeId) { push(L.warn('already the active account')); return; }
            push(L.info(`switching to @${target.username}...`));
            await switchAccount(target.id);
            return;
          }
          case 'remove':
          case 'rm': {
            if (!requireLogin()) return;
            const bay = parseInt(subArgs[0], 10);
            if (!subArgs[0] || isNaN(bay) || bay < 1 || bay > accounts.length) {
              push(L.err(`usage: acc remove <bay>  (1–${accounts.length})`)); return;
            }
            const target = accounts[bay - 1];
            if (!needsSudo(`acc remove ${bay}`)) return;
            removeAccount(target.id);
            push(L.ok(`removed @${target.username} from bay ${bay}`));
            return;
          }
          case 'add': {
            const uname = subArgs[0];
            if (!uname) { push(L.err('usage: acc add <username>')); return; }
            if (active && !needsSudo(`acc add ${uname}`)) return;
            push(L.out(`password for ${uname}: `));
            const pw = await promptPassword();
            if (!pw) { push(L.warn('cancelled')); return; }
            push(L.info(`signing in as ${uname}... (page will reload)`));
            await login({ username: uname, password: pw }, '/i/flow/mci');
            return;
          }
          case 'move':
          case 'mv': {
            const fromBay = parseInt(subArgs[0], 10);
            const toBay = parseInt(subArgs[1], 10);
            if (!subArgs[0] || !subArgs[1] || isNaN(fromBay) || isNaN(toBay)) {
              push(L.err('usage: acc move <from_bay> <to_bay>')); return;
            }
            const allAccts = storageGet<Account[]>(KEYS.ACCOUNTS, []);
            const fromIdx = fromBay - 1;
            const toIdx = toBay - 1;
            if (fromIdx < 0 || fromIdx >= allAccts.length) {
              push(L.err(`bay ${fromBay} has no account`)); return;
            }
            if (toBay < 1 || toBay > 10) {
              push(L.err('bay must be between 1 and 10')); return;
            }
            if (fromBay === toBay) {
              push(L.warn('source and destination bays are the same')); return;
            }
            const fromAcc = allAccts[fromIdx];
            const toAcc = toIdx < allAccts.length ? allAccts[toIdx] : null;

            if (!toAcc) {
              const next = [...allAccts];
              next.splice(fromIdx, 1);
              const insertAt = Math.min(toIdx, next.length);
              next.splice(insertAt, 0, fromAcc);
              storageSet(KEYS.ACCOUNTS, next);
              push(L.ok(`moved @${fromAcc.username} to bay ${toBay}`));
              push(L.info('reloading...'));
              setTimeout(() => window.location.reload(), 500);
              return;
            }

            push(L.warn(`An account is already using that bay (@${toAcc.username}). Type y to swap bays, o to overwrite and remove current, or n to cancel operation`));
            const answer = (await promptText()).trim().toLowerCase();

            if (!answer || answer === 'n') {
              push(L.warn('cancelled')); return;
            } else if (answer === 'y') {
              const next = [...allAccts];
              next[fromIdx] = toAcc;
              next[toIdx] = fromAcc;
              storageSet(KEYS.ACCOUNTS, next);
              push(L.ok(`swapped @${fromAcc.username} (bay ${fromBay}) and @${toAcc.username} (bay ${toBay})`));
              push(L.info('reloading...'));
              setTimeout(() => window.location.reload(), 500);
            } else if (answer === 'o') {
              const next = [...allAccts];
              next.splice(fromIdx, 1);
              const adjustedToIdx = toIdx > fromIdx ? toIdx - 1 : toIdx;
              next[adjustedToIdx] = fromAcc;
              storageSet(KEYS.ACCOUNTS, next);
              push(L.ok(`moved @${fromAcc.username} to bay ${toBay}, removed @${toAcc.username}`));
              push(L.info('reloading...'));
              setTimeout(() => window.location.reload(), 500);
            } else {
              push(L.warn(`unknown option "${answer}", cancelled`));
            }
            return;
          }
          default:
            push(L.err(`unknown subcommand: "${sub ?? ''}". try: list, switch, remove, add, move`));
        }
        return;
      }

      default:
        push(L.err(`unknown command: "${cmd}". type 'help' for available commands`));
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busyRef.current && !pendingPromptRef.current) return;
    const raw = input.trim();
    setInput('');
    setHistIdx(-1);
    histBuf.current = '';

    if (pendingPromptRef.current) {
      const isHidden = promptMode === 'password';
      setPromptMode('none');
      if (isHidden) {
        push(L.cmd(`[${username}@mypayindia ~]$ ${'·'.repeat(Math.max(raw.length, 1))}`));
      } else {
        push(L.out(`> ${raw}`));
      }
      const resolve = pendingPromptRef.current;
      pendingPromptRef.current = null;
      resolve(raw);
      return;
    }

    if (!raw) return;

    setCmdHistory((prev: string[]) => [raw, ...prev.filter(h => h !== raw)].slice(0, 500));

    push(L.cmd(`[${username}@mypayindia ~]$ ${raw}`));

    busyRef.current = true;
    setBusy(true);
    try {
      const cmds = raw.split('&&').map(s => s.trim()).filter(Boolean);
      for (const cmd of cmds) {
        try {
          await runCmd(cmd);
        } catch (err) {
          push(L.err(describeError(err)));
          break;
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      if (histIdx === -1) histBuf.current = input;
      const newIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(newIdx);
      setInput(cmdHistory[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      if (histIdx === 0) {
        setHistIdx(-1);
        setInput(histBuf.current);
      } else {
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.split(' ');
      if (parts.length === 1) {
        const partial = parts[0].toLowerCase();
        if (!partial) return;
        const matches = COMMANDS.filter(c => c.startsWith(partial));
        if (matches.length === 1) {
          setInput(matches[0] + ' ');
        } else if (matches.length > 1) {
          push(L.out(matches.join('   ')));
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
      storageRemove(CLI_LINES_KEY);
    }
  }

  return (
    <div className="cli-wrap" onClick={handleWrapClick}>
      <div className="cli-topbar">
        <button className="cli-clear-btn" onClick={handleClearAll} title="Clear terminal history">CLEAR</button>
      </div>
      <div className="cli-output" ref={outputRef}>
        {lines.map(l =>
          l.type === 'sep'
            ? <div key={l.id} className="cli-line cli-line-sep" />
            : <div key={l.id} className={`cli-line cli-line-${l.type}`}>{l.text}</div>
        )}
      </div>

      <form className="cli-input-row" onSubmit={handleSubmit} autoComplete="off" spellCheck={false}>
        <span className="cli-prompt">[{username}@mypayindia ~]$</span>
        <input
          ref={inputRef}
          className="cli-input"
          type={promptMode === 'password' ? 'password' : undefined}
          value={input}
          onChange={e => { setInput(e.target.value); setHistIdx(-1); }}
          onKeyDown={handleKeyDown}
          disabled={busy && promptMode === 'none'}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={busy && promptMode === 'none' ? '' : 'type a command...'}
          aria-label="Command input"
        />
        {busy
          ? <span className="cli-busy-dot" />
          : <button type="submit" className="cli-send-btn" disabled={!input.trim()} aria-label="Run">GO</button>
        }
      </form>
    </div>
  );
}
