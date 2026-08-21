import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const TOKEN_RE = /(\*[^*\n]+\*|\[[^\]\n]+\]\(\/(?!\/)[^)\s]*\))/g;
const LINK_RE = /^\[([^\]\n]+)\]\((\/(?!\/)[^)\s]*)\)$/;

function renderToken(token: string, key: string): ReactNode {
  if (token.length > 2 && token.startsWith('*') && token.endsWith('*')) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }

  const link = LINK_RE.exec(token);
  if (!link) return token;

  const [, label, target] = link;
  return <Link key={key} to={target}>{label}</Link>;
}

export function AgentText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => part ? renderToken(part, `agent-text-${index}`) : null)}
    </span>
  );
}