import { useState, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { useAuth } from '../context/auth_ctx.tsx';
import { API_BASE } from '../api/config.js';
import { ArrowLeftIcon, ExternalIcon } from '../components/icons.tsx';
import { ErrorBox, Skeleton } from '../components/status.tsx';

export const GAMES = [
  { id: 'intelligenceid', name: 'Intelligence Identifier', description: "Wanna get funds? No worries, the Intelligence Identifier has you covered! No money is free though. You have to prove to the Intelligence Identifier that you're worthy." },
  { id: 'minesweeper',    name: 'Minesweeper',             description: 'Investment Opportunity™ Jeremy Clarkson Minefield' },
  { id: 'wordle',         name: 'Wordle',                  description: null },
  { id: 'button',         name: 'Button',                  description: null },
  { id: 'coinflip',       name: 'Coin Flip',               description: 'Your Investment Opportunity™ here is... a coinflip. Have fun!' },
  { id: 'slots',          name: 'Slots',                   description: 'Investment Opportunity™ at the mercy of Spectacular Machinery' },
  { id: 'mines',          name: 'Mines',                   description: null },
  { id: 'roulette',       name: 'Roulette',                description: 'If you lose, it can be your fault' },
] as const;

const GAME_MAP = new Map(GAMES.map((g) => [g.id, g]));

const MYPAY_ORIGIN = 'https://mypayindia.com';

function buildInterceptor(): string {
  return `<script>(function(){
    var O='${MYPAY_ORIGIN}',P='${API_BASE}';

    function rw(u){return typeof u==='string'&&u.startsWith(O)?P+u.slice(O.length):u;}

    var _f=window.fetch;
    window.fetch=function(u,o){
      var ru=rw(u);
      if(ru!==u)o=Object.assign({credentials:'include'},o||{});
      return _f.call(this,ru,o);
    };

    var _o=XMLHttpRequest.prototype.open;
    var _s=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(){
      var ru=rw(arguments[1]);
      this._mpiRw=(ru!==arguments[1]);
      arguments[1]=ru;
      return _o.apply(this,arguments);
    };
    XMLHttpRequest.prototype.send=function(){
      if(this._mpiRw)this.withCredentials=true;
      return _s.apply(this,arguments);
    };

    var _id=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    if(_id&&_id.set)Object.defineProperty(HTMLImageElement.prototype,'src',{get:_id.get,set:function(v){_id.set.call(this,rw(v));}});

    window.turnstile={
      render:function(){return 'mypwaindia-says-no';},
      execute:function(){
        if(window.turnstileResolve){
          window.turnstileResolve('bypassed-by-pwa');
          window.turnstileResolve=null;
        }
      },
      reset:function(){}
    };

    Object.defineProperty(window,'isVerified',{
      get:function(){return true;},
      configurable:true
    });

    Object.defineProperty(window,'turnstileValidated',{
      get:function(){return true;},
      set:function(){/* nice try, showTurnstileSuccess */},
      configurable:true
    });

    document.addEventListener('DOMContentLoaded',function(){
      if(typeof startTurnstileValidation==='function') startTurnstileValidation();
    });
  })();<\/script>`;
}

export default function IotmGamePage() {
  const { game: gameId } = useParams<{ game: string }>();
  const config = gameId ? GAME_MAP.get(gameId as typeof GAMES[number]['id']) : null;
  usePageTitle(`${config ? config.name + ' / ' : ''}Investment Opportunities™`);

  const { active } = useAuth();
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [error, setError]   = useState<Error | null>(null);

  useEffect(() => {
    if (!config || !active?.token) return;

    let cancelled = false;
    setSrcDoc(null);
    setError(null);

    const token    = active.token;
    const proxyUrl = `${API_BASE}/accountservices/iotm/${config.id}/?minimal`;
    const base     = `${MYPAY_ORIGIN}/accountservices/iotm/${config.id}/`;

    fetch(proxyUrl, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (cancelled) return;

        const stripped = html
          .replace(/<script[^>]+challenges\.cloudflare\.com\/turnstile[^>]*><\/script>/gi, '')
          .replace(/<div[^>]+cf-turnstile[^>]*>[^<]*<\/div>/gi, '')
          .replace(/<div[^>]+cf-turnstile[^>]*>/gi, '');

        const baseTag     = `<base href="${base}">`;
        const interceptor = buildInterceptor();
        const injected    = stripped.replace(/(<head[^>]*>)/i, `$1${baseTag}${interceptor}`);

        setSrcDoc(injected.includes(baseTag) ? injected : baseTag + interceptor + stripped);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => { cancelled = true; };
  }, [config?.id, active?.token]);

  if (!config) return <Navigate to="/i/invest" replace />;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.9rem', color: 'var(--muted)' }}>
        <Link to="/i/invest" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
          <ArrowLeftIcon /> Investment Opportunities™
        </Link>
        <span>-</span>
        <a
          href={`https://mypayindia.com/accountservices/iotm/${config.id}/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}
        >
          perform this on the main website <ExternalIcon />
        </a>
      </div>

      <h1 className="mt-0">{config.name}</h1>

      {config.description && (
        <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 16 }}>{config.description}</p>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: 22 }}><ErrorBox error={error} /></div>
        ) : srcDoc === null ? (
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={32} style={{ width: '40%' }} />
            <Skeleton height={16} style={{ width: '70%' }} />
            <Skeleton height={16} style={{ width: '55%' }} />
            <Skeleton height={16} style={{ width: '65%' }} />
            <Skeleton height={200} style={{ width: '100%', marginTop: 8 }} />
            <Skeleton height={16} style={{ width: '50%' }} />
            <Skeleton height={16} style={{ width: '60%' }} />
          </div>
        ) : (
          <iframe
            srcDoc={srcDoc}
            title={config.name}
            style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 480, border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </>
  );
}