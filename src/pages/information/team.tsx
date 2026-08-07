import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { getTeam } from '../../api/flow.js';
import { Skeleton, ErrorBox, Empty } from '../../components/ui/status.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { TeamMemberCard, avatarConductor, type TeamMember } from '../../components/data/team_member_card.tsx';

export default function TeamPage() {
  usePageTitle('Meet the team');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchParams] = useSearchParams();
  const highlight = (searchParams.get('highlight') ?? '').trim().toLowerCase();
  const highlightRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);
  const { data, loading, error } = useCachedQuery<{ team: TeamMember[] }>('team', () => getTeam() as Promise<{ team: TeamMember[] }>, []);
  const team = data?.team || [];
  const current = team.filter((m) => (m.status ?? 'current') === 'current');
  const past = team.filter((m) => m.status === 'past');
  const specialThanks = team.filter((m) => m.status === 'special_thanks');

  useEffect(() => {
    if (!highlight || scrolledFor.current === highlight) return;
    const el = highlightRef.current;
    if (!el) return;
    scrolledFor.current = highlight;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, data]);

  const renderGrid = (members: TeamMember[]) => (
    <div className="grid cols-team">
      {members.map((m) => {
        const highlighted = !!highlight && m.name.trim().toLowerCase() === highlight;
        return (
          <div
            key={m.name}
            ref={highlighted ? highlightRef : undefined}
            className={`card team-card${highlighted ? ' team-card--highlight' : ''}`}
          >
            <TeamMemberCard m={m} onAvatarClick={setSelectedMember} />
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Modal className="slide" open={!!selectedMember} onClose={() => setSelectedMember(null)} title={selectedMember?.name ?? ''}>
        {selectedMember && (
          <a href={avatarConductor(selectedMember.avatar)} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
            <img
              src={avatarConductor(selectedMember.avatar)}
              alt={selectedMember.name}
              style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }}
            />
          </a>
        )}
      </Modal>
      <div className="team-heading-row">
        <h1 className="mt-0">Meet the team</h1>
        <Link to="/i/team/globe" className="btn secondary compact">Open globe...</Link>
      </div>
      <p className="mt-0 mb-0">Get to know the people behind MyPayIndia, the future of online banking!</p>
      <p className="mt-0 mb-0 muted"><i>Currently our team consists of <strong>{current.length || (
        <span className="skeleton" style={{ display: 'inline-block', width: 24, height: '1.2em', borderRadius: 3, verticalAlign: 'middle' }} />
      )}</strong> people:</i></p>

      {loading && !data ? (
        <div className="grid cols-team">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card team-card">
              <div className="team-header">
                <Skeleton width={72} height={72} radius={50} />
                <div className="team-header-info">
                  <Skeleton width={110} height={16} />
                  <Skeleton width={80} height={13} style={{ marginTop: 6 }} />
                </div>
              </div>
              <Skeleton width={160} height={11} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) :
       error ? <ErrorBox error={error} /> :
       team.length === 0 ? <Empty>N</Empty> :
       <>
        {renderGrid(current)}
        {past.length > 0 && (
          <>
            <h2 className="team-status-heading">Past members</h2>
            {renderGrid(past)}
          </>
        )}
        {specialThanks.length > 0 && (
          <>
            <h2 className="team-status-heading">Special thanks</h2>
            {renderGrid(specialThanks)}
          </>
        )}
       </>
      }
    </>
  );
}
