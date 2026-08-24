import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { getTeam } from '../../api/flow.js';
import { useSettings } from '../../context/settings_ctx.tsx';
import { Skeleton, ErrorBox, Empty } from '../../components/ui/status.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { TeamMemberCard, type TeamMember } from '../../components/data/team_member_card.tsx';
import { hexToRgb, normalizeHex } from '../../utils/colors.js';
import countries from '../../data/world_countries.json';
import centroids from '../../data/country_centroids.json';
import { InfoIcon } from '../../components/ui/icons.tsx';

type Rgb = { r: number; g: number; b: number };
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function rgbToHex({ r, g, b }: Rgb) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

interface Dot { lat: number; lng: number; member: TeamMember; radius: number }
interface Label { lat: number; lng: number; text: string; el?: HTMLElement }
interface Connection { start: Dot; end: Dot }
type Centroid = { lat: number; lng: number; name: string };
const CENTROIDS = centroids as Record<string, Centroid>;

type Ring = number[][];
type Poly = Ring[];
const COUNTRY_MAIN: Record<string, Poly> = (() => {
  const bboxArea = (ring: Ring) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    return (maxX - minX) * (maxY - minY);
  };
  const out: Record<string, Poly> = {};
  for (const f of (countries as any).features) {
    const iso: string | undefined = f.properties?.iso;
    if (!iso) continue;
    const polys: Poly[] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let best: Poly | null = null, bestArea = -1;
    for (const p of polys) { const a = bboxArea(p[0]); if (a > bestArea) { bestArea = a; best = p; } }
    if (best) out[iso.toUpperCase()] = best;
  }
  return out;
})();

function ringHas(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function polyHas(x: number, y: number, poly: Poly): boolean {
  if (!ringHas(x, y, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (ringHas(x, y, poly[h])) return false;
  return true;
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function borderDist(x: number, y: number, poly: Poly, kx: number): number {
  let min = Infinity;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = segDist(x * kx, y, ring[j][0] * kx, ring[j][1], ring[i][0] * kx, ring[i][1]);
      if (d < min) min = d;
    }
  }
  return min;
}
function safeCenter(poly: Poly): { lat: number; lng: number; clr: number } {
  const outer = poly[0];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of outer) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const steps = 32;
  let best = { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2, clr: 0 };
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const x = minX + ((i + 0.5) / steps) * (maxX - minX);
      const y = minY + ((j + 0.5) / steps) * (maxY - minY);
      if (!polyHas(x, y, poly)) continue;
      const clr = borderDist(x, y, poly, kx);
      if (clr > best.clr) best = { lat: y, lng: x, clr };
    }
  }
  return best;
}

function scatter(base: { lat: number; lng: number }, i: number, total: number, spread: number): { lat: number; lng: number } {
  if (total <= 1) return { lat: base.lat, lng: base.lng };
  const golden = 2.399963229728653;
  const radius = spread * Math.sqrt((i + 0.5) / total);
  const angle = (i + 1) * golden;
  const dLat = radius * Math.sin(angle);
  const dLng = (radius * Math.cos(angle)) / Math.max(0.2, Math.cos((base.lat * Math.PI) / 180));
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export default function TeamMapPage() {
  usePageTitle('Team globe');
  const { settings } = useSettings();
  const isLight = settings.theme === 'light';
  const globeEl = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [connectDots, setConnectDots] = useState(false);

  const { data, loading, error } = useCachedQuery<{ team: TeamMember[] }>('team', () => getTeam() as Promise<{ team: TeamMember[] }>, []);
  const team = useMemo(() => (data?.team || []).filter((m) => (m.status ?? 'current') === 'current'), [data]);

  const brand = useMemo(() => normalizeHex(settings.accent) || '#d03505', [settings.accent]);

  const palette = useMemo(() => {
    const acc = hexToRgb(brand) || { r: 249, g: 115, b: 22 };
    const base = isLight ? { r: 244, g: 247, b: 251 } : { r: 8, g: 10, b: 14 };
    const t = isLight
      ? { ocean: 0.10, land: 0.30, side: 0.20, stroke: 0.44 }
      : { ocean: 0.06, land: 0.24, side: 0.14, stroke: 0.36 };
    return {
      ocean: rgbToHex(mix(base, acc, t.ocean)),
      land: rgbToHex(mix(base, acc, t.land)),
      side: rgbToHex(mix(base, acc, t.side)),
      stroke: rgbToHex(mix(base, acc, t.stroke)),
      atmo: brand,
      label: isLight ? 'rgba(23,33,48,0.9)' : 'rgba(233,240,248,0.92)',
    };
  }, [brand, isLight]);

  const countryRanks = useMemo(() => {
    const map = new Map<string, { name: string; flag: string; count: number }>();
    for (const m of team) {
      const key = m.country || m.country_name || m.name;
      const cur = map.get(key) || { name: m.country_name || m.country || 'Unknown', flag: m.country_flag || '', count: 0 };
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [team]);

  const { dots, labels } = useMemo(() => {
    const byCountry = new Map<string, TeamMember[]>();
    for (const m of team) {
      const key = (m.country || '??').toUpperCase();
      const list = byCountry.get(key) || [];
      list.push(m);
      byCountry.set(key, list);
    }
    const dots: Dot[] = [];
    const labels: Label[] = [];
    const MARGIN = 0.35;
    for (const [key, members] of byCountry) {
      const centroid = CENTROIDS[key] || { lat: 0, lng: 0, name: members[0].country_name || key };
      const poly = COUNTRY_MAIN[key];
      const anchor = poly ? safeCenter(poly) : { lat: centroid.lat, lng: centroid.lng, clr: 1.5 };
      const center = anchor.clr > 0 ? { lat: anchor.lat, lng: anchor.lng } : { lat: centroid.lat, lng: centroid.lng };
      const clr = Math.max(anchor.clr, 0.12);

      const n = members.length;
      const rSafe = Math.max(0, clr - MARGIN);
      const disc = n === 1
        ? Math.max(0.08, Math.min(0.7, rSafe * 0.7))
        : Math.max(0.08, Math.min(0.7, rSafe / (1.3 * Math.sqrt(n) + 1)));
      const spread = n === 1 ? 0 : Math.max(0, rSafe - disc);
      labels.push({ lat: center.lat + Math.max(0.7, clr * 0.9), lng: center.lng, text: (centroid.name || key).toUpperCase() });

      members.forEach((m, i) => {
        let { lat, lng } = scatter(center, i, members.length, spread);
        if (poly) {
          const kx = Math.cos((lat * Math.PI) / 180);
          if (!polyHas(lng, lat, poly) || borderDist(lng, lat, poly, kx) < disc + MARGIN * 0.5) {
            lat = center.lat; lng = center.lng;
          }
        }
        dots.push({ lat, lng, member: m, radius: disc });
      });
    }
    return { dots, labels };
  }, [team]);

  const connections = useMemo<Connection[]>(() => {
    if (!connectDots || dots.length < 2) return [];
    if (dots.length === 2) return [{ start: dots[0], end: dots[1] }];
    return dots.map((dot, i) => ({ start: dot, end: dots[(i + 1) % dots.length] }));
  }, [connectDots, dots]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const globeMaterial = useMemo(() => new THREE.MeshPhongMaterial({ color: palette.ocean, shininess: 6 }), [palette.ocean]);

  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const labelsRef = useRef<Label[]>(labels);
  labelsRef.current = labels;

  const onReady = () => {
    const g = globeEl.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.45;
    c.enableZoom = true;
    c.minDistance = 108;
    c.maxDistance = 700;
    c.addEventListener('start', () => {
      clearTimeout(resumeTimer.current);
      c.autoRotate = false;
    });
    c.addEventListener('end', () => {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => { c.autoRotate = true; }, 1300);
    });
    const update = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const alt = g.pointOfView().altitude;
      const vis = Math.min(1, Math.max(0, (1.95 - alt) / (1.95 - 1.15)));
      const scale = 0.9 + 0.28 * vis;
      wrap.style.setProperty('--globe-label-scale', scale.toFixed(3));
      wrap.style.setProperty('--globe-label-opacity', (vis * 0.85).toFixed(3));

      const boxes: { x: number; y: number; w: number; h: number }[] = [];
      for (const d of labelsRef.current) {
        const el = d.el;
        if (!el) continue;
        if (vis <= 0.01 || el.dataset.front === '0') { el.classList.add('is-hidden'); continue; }
        const sc = g.getScreenCoords(d.lat, d.lng, 0.008);
        const w = el.offsetWidth || d.text.length * 6;
        const h = el.offsetHeight || 12;
        const box = { x: sc.x - w / 2, y: sc.y - h / 2, w, h };
        const hit = boxes.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y);
        if (hit) { el.classList.add('is-hidden'); }
        else { el.classList.remove('is-hidden'); boxes.push(box); }
      }
    };
    c.addEventListener('change', update);
    g.pointOfView({ lat: 25, lng: 15, altitude: 2.4 }, 0);
    update();
  };

  type Rank = { name: string; flag: string; count: number };
  const full = (c: Rank) => <>{c.flag} <strong>{c.name}</strong> ({c.count})</>;
  const plainList = (list: Rank[]) => list.map((c, i) => (
    <Fragment key={i}>{i > 0 ? ', ' : ''}{c.flag} <strong>{c.name}</strong></Fragment>
  ));

  const ranksSentence = (() => {
    if (countryRanks.length === 0) return null;
    const most = countryRanks[0];
    const maxCount = most.count;
    const minCount = countryRanks[countryRanks.length - 1].count;
    if (minCount === maxCount) {
      return <>Every country is tied with {maxCount} {maxCount === 1 ? 'member' : 'members'} each: {plainList(countryRanks)}.</>;
    }
    const least = countryRanks.filter((c) => c.count === minCount);
    const second = countryRanks[1];
    return (
      <>
        The country with the most team members is {full(most)}
        {second && second.count > minCount && <>. 2nd place is {full(second)}</>}
        {least.length > 1
          ? <>, and {plainList(least)} all have one member</>
          : <>, and {full(least[0])} all have one member</>}
        .
      </>
    );
  })();

  return (
    <>
      <Modal className="slide" open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <div className="team-card team-card--modal">
            <TeamMemberCard m={selected} />
          </div>
        )}
      </Modal>

      <div className="team-heading-row">
        <h1 className="mt-0">Team globe</h1>
        <Link to="/i/team" className="btn secondary compact">Go back...</Link>
      </div>
      {ranksSentence && (
        <p className="mt-0 mb-0 muted"><i>{ranksSentence}</i></p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="mt-0 mb-0 alert alert-info"><InfoIcon /><span>Dots are scattered randomly within each member's country (for better clarity and space) and don't reflect anyone's actual location. If you refresh the page, the dots will be somewhere new</span></div>
      <div className="checkbox-row">
        <input
          id="team-globe-connect-dots"
          type="checkbox"
          checked={connectDots}
          onChange={(e) => setConnectDots(e.target.checked)}
          disabled={dots.length < 2}
        />
        <label htmlFor="team-globe-connect-dots" style={{ margin: 0 }}>Connect dots</label>
      </div>

      {error ? <ErrorBox error={error} /> :
       (!loading && team.length === 0) ? <Empty>N</Empty> :
       <div className="team-globe-wrap" ref={wrapRef}>
         {(loading && !data) && (
           <div className="team-globe-loading"><Skeleton width={220} height={220} radius={999} /></div>
         )}
         {dims.w > 0 && data && (
           <Globe
             ref={globeEl}
             width={dims.w}
             height={dims.h}
             backgroundColor="rgba(0,0,0,0)"
             globeMaterial={globeMaterial}
             showAtmosphere
             atmosphereColor={palette.atmo}
             atmosphereAltitude={0.16}
             polygonsData={(countries as any).features}
             polygonCapColor={() => palette.land}
             polygonSideColor={() => palette.side}
             polygonStrokeColor={() => palette.stroke}
             polygonAltitude={0.008}
             htmlElementsData={labels}
             htmlLat={(d: any) => d.lat}
             htmlLng={(d: any) => d.lng}
             htmlAltitude={0.008}
             htmlElement={(d: any) => {
               const el = document.createElement('div');
               el.className = 'globe-country-label';
               el.textContent = d.text;
               d.el = el;
               return el;
             }}
             htmlElementVisibilityModifier={(el: HTMLElement, isVisible: boolean) => {
               el.dataset.front = isVisible ? '1' : '0';
             }}
             htmlTransitionDuration={0}
             pointsData={dots}
             pointLat={(d: any) => d.lat}
             pointLng={(d: any) => d.lng}
             pointColor={() => brand}
             pointAltitude={0.02}
             pointRadius={(d: any) => d.radius}
             pointsMerge={false}
             pointLabel={(d: any) => `<div class="team-globe-tip">${d.member.name} ${d.member.country_flag ?? ''}<br><span>${d.member.role}</span></div>`}
             onPointClick={(d: any) => setSelected(d.member)}
             arcsData={connections}
             arcStartLat={(d: any) => d.start.lat}
             arcStartLng={(d: any) => d.start.lng}
             arcStartAltitude={0.02}
             arcEndLat={(d: any) => d.end.lat}
             arcEndLng={(d: any) => d.end.lng}
             arcEndAltitude={0.02}
             arcColor={() => brand}
             arcAltitudeAutoScale={0.3}
             arcStroke={0.12}
             arcsTransitionDuration={700}
             onGlobeReady={onReady}
           />
         )}
       </div>
      }
    </>
  );
}
