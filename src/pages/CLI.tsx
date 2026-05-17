import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { transfer, listTransactions, getTransaction } from '../api/transactions.js';
import { createLink, listLinks, cancelLink, claimLink, getLink } from '../api/links.js';
import { getUserInfo, getRestrictions, listSessions, invalidateSession, verifyEmail } from '../api/user.js';
import { getLeaderboard, getTeam } from '../api/info.js';
import { rupeesToPaisa, formatINR } from '../utils/money.js';
import { formatDate, formatRelative } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import '../styles/cli.css';

function tokenize(raw) {
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
const L = {
  cmd: (text) => ({ id: _lid++, type: 'cmd', text }),
  out: (text) => ({ id: _lid++, type: 'out', text }),
  ok: (text) => ({ id: _lid++, type: 'ok', text }),
  err: (text) => ({ id: _lid++, type: 'err', text }),
  warn: (text) => ({ id: _lid++, type: 'warn', text }),
  info: (text) => ({ id: _lid++, type: 'info', text }),
  sep: () => ({ id: _lid++, type: 'sep', text: '' }),
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
  '  clear / cls                      clear the terminal',
  '  logout                           sign out',
  '  help                             show this help',
  '',
  '  commands can be chained using &&',
  '  wrap multi-word args in "quotes"',
  '  arrow up/down: command history - tab: autocomplete',
];

export default function CLIPage() {
  usePageTitle('MyCLiIndia');
  const { active } = useAuth();
  const navigate = useNavigate();

  const username = active?.username ?? '?';

  const [lines, setLines] = useState(() => [
    L.info('┌──────────────────────────────┐'),
    L.ok('│    Welcome to MyCLiIndia!    │'),
    L.info('└──────────────────────────────┘'),
    L.out(`logged in as ${username}@mypayindia - type 'help' to see a list of commands`),
    L.sep(),
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);

  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const histBuf = useRef('');
  const busyRef = useRef(false);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    function onKey(e) {
      if (document.activeElement === inputRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return;
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleWrapClick(e) {
    if (window.getSelection()?.toString()) return;
    if (e.target !== inputRef.current) inputRef.current?.focus();
  }

  const push = useCallback((...newLines) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  async function runCmd(raw) {
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
        return;

      case 'help':
        push(L.info('list of commands:'), ...HELP.map(L.out));
        return;

      case 'balance':
      case 'bal': {
        const info = await getUserInfo(active);
        push(L.ok(`${formatINR(info.balance)}`));
        return;
      }

      case 'info':
      case 'whoami': {
        const info = await getUserInfo(active);
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
        const [amtStr, recipient, note] = args;
        if (!amtStr || !recipient) {
          push(L.err(`usage: transfer <amount> <recipient> [note]`)); return;
        }
        const paisa = rupeesToPaisa(amtStr);
        if (!Number.isInteger(paisa) || paisa <= 0) {
          push(L.err(`invalid amount: "${amtStr}" - use e.g. 55 or 55.50`)); return;
        }
        const res = await transfer(active, {
          recipient,
          amount: paisa,
          ...(note ? { note } : {}),
        });
        push(L.ok(`sent ${formatINR(paisa)} to ${recipient}`));
        if (note) push(L.out(`note: "${note}"`));
        push(L.out(`tx id: ${res.transaction_id}`));
        return;
      }

      case 'link': {
        const [amtStr, note] = args;
        if (!amtStr) {
          push(L.err(`usage: link <amount> [note]`)); return;
        }
        const paisa = rupeesToPaisa(amtStr);
        if (!Number.isInteger(paisa) || paisa <= 0) {
          push(L.err(`invalid amount: "${amtStr}"`)); return;
        }
        const lnk = await createLink(active, {
          amount: paisa,
          ...(note ? { note } : {}),
        });
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
        const filter = (args[0] ?? 'all').toLowerCase();
        const data = await listLinks(active);
        let arr = data.links ?? [];
        if (filter === 'active') arr = arr.filter(l => l.status === 'active');
        else if (filter === 'past') arr = arr.filter(l => l.status !== 'active');

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
        const lnk = await getLink(token);
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
        const [token] = args;
        if (!token) { push(L.err('Usage: claim <token>')); return; }
        const res = await claimLink(active, token);
        push(L.ok(`claimed ${formatINR(res.amount ?? 0)}!`));
        push(L.out(`tx id: ${res.transaction_id}`));
        return;
      }

      case 'cancel': {
        const [token] = args;
        if (!token) { push(L.err('usage: cancel <token>')); return; }
        await cancelLink(active, token);
        push(L.ok(`link ${token} cancelled and refunded`));
        return;
      }

      case 'history':
      case 'txns': {
        const n = parseInt(args[0] ?? '10', 10);
        const count = (isNaN(n) || n <= 0) ? 10 : Math.min(n, 200);
        const data = await listTransactions(active);
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
        const [id] = args;
        if (!id) { push(L.err('usage: tx <transaction_id>')); return; }
        const t = await getTransaction(active, id);
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
        const data = await getLeaderboard();
        const board = data.leaderboard ?? [];
        if (!board.length) { push(L.out('there is nothing to show')); return; }
        push(L.info('leaderboard:'));
        board.slice(0, 25).forEach((u, i) => {
          const isSelf = u.username === username;
          const line = `  ${String(i + 1).padStart(2)}.  ${('@' + u.username).padEnd(22)}  ${formatINR(u.balance)}`;
          push(isSelf ? L.ok(line + '  (you)') : L.out(line));
        });
        return;
      }

      case 'team': {
        const data = await getTeam();
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
        const data = await listSessions(active);
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
        const [sid] = args;
        if (!sid) { push(L.err('usage: invalidate <session_id>')); return; }
        await invalidateSession(active, sid);
        push(L.ok(`ok`));
        return;
      }

      case 'restrictions': {
        const data = await getRestrictions(active);
        const entries = Object.entries(data?.restrictions ?? {});
        if (!entries.length) { push(L.ok('there is nothing to show')); return; }
        let any = false;
        for (const [key, val] of entries) {
          if (val?.active) {
            any = true;
            push(L.warn(`  ${key}: ACTIVE${val.expires_at ? ` - expires ${formatDate(val.expires_at)}` : ''}`));
          } else {
            push(L.out(`  ${key}: inactive`));
          }
        }
        if (!any) push(L.ok('there is nothing to show'));
        return;
      }

      case 'verify-email': {
        await verifyEmail(active);
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
        const path = PAGE_MAP[page.toLowerCase()];
        if (!path) {
          push(L.err(`unknown page: "${page}". available: ${Object.keys(PAGE_MAP).join(', ')}`)); return;
        }
        push(L.info(`> ${path}`));
        navigate(path);
        return;
      }

      case 'logout':
        push(L.info('ok'));
        setTimeout(() => navigate('/i/flow/logout'), 350);
        return;

      default:
        push(L.err(`unknown command: "${cmd}". type 'help' for available commands`));
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (busyRef.current) return;
    const raw = input.trim();
    setInput('');
    setHistIdx(-1);
    histBuf.current = '';
    if (!raw) return;

    setCmdHistory(prev => [raw, ...prev.filter(h => h !== raw)].slice(0, 500));

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

  function handleKeyDown(e) {
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
    }
  }

  return (
    <div className="cli-wrap" onClick={handleWrapClick}>
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
          value={input}
          onChange={e => { setInput(e.target.value); setHistIdx(-1); }}
          onKeyDown={handleKeyDown}
          disabled={busy}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={busy ? '' : 'type a command...'}
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