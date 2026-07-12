import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useCachedQuery } from '../hooks/cached_query.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getTeam } from '../api/flow.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { Modal } from '../components/modal.tsx';
import { TeamMemberCard, type TeamMember } from '../components/team_member_card.tsx';
import { hexToRgb, normalizeHex } from '../utils/colors.js';
import countries from '../data/world_countries.json';
import centroids from '../data/country_centroids.json';

type Rgb = { r: number; g: number; b: number };
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function rgbToHex({ r, g, b }: Rgb) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

interface Dot { lat: number; lng: number; member: TeamMember }
interface Label { lat: number; lng: number; text: string; el?: HTMLElement }
type Centroid = { lat: number; lng: number; name: string };
const CENTROIDS = centroids as Record<string, Centroid>;

function scatter(base: Centroid, i: number, total: number): { lat: number; lng: number } {
  if (total <= 1) return { lat: base.lat, lng: base.lng };
  const golden = 2.399963229728653;
  const radius = 1.6 * Math.sqrt((i + 0.5) / total);
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

  const { data, loading, error } = useCachedQuery<{ team: TeamMember[] }>('team', () => getTeam() as Promise<{ team: TeamMember[] }>, []);
  const team = useMemo(() => data?.team || [], [data]);

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
    const DOT_LIFT = 2.2;
    for (const [key, members] of byCountry) {
      const base = CENTROIDS[key] || { lat: 0, lng: 0, name: members[0].country_name || key };
      labels.push({ lat: base.lat, lng: base.lng, text: (base.name || key).toUpperCase() });
      members.forEach((m, i) => {
        const { lat, lng } = scatter(base, i, members.length);
        dots.push({ lat: lat + DOT_LIFT, lng, member: m });
      });
    }
    return { dots, labels };
  }, [team]);

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
    c.minDistance = 180;
    c.maxDistance = 600;
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
             pointRadius={0.62}
             pointsMerge={false}
             pointLabel={(d: any) => `<div class="team-globe-tip">${d.member.name} ${d.member.country_flag ?? ''}<br><span>${d.member.role}</span></div>`}
             onPointClick={(d: any) => setSelected(d.member)}
             onGlobeReady={onReady}
           />
         )}
       </div>
      }
    </>
  );
}
