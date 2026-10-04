import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const TOKEN_RE = /(\*[^*\n]+\*|\[[^\]\n]+\]\(\/(?!\/)[^)\s]*\))/g;
const LINK_RE = /^\[([^\]\n]+)\]\((\/(?!\/)[^)\s]*)\)$/;

function renderToken(token: string, key: string, link_class_name?: string): ReactNode {
  if (token.length > 2 && token.startsWith('*') && token.endsWith('*')) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }

  const link = LINK_RE.exec(token);
  if (!link) return token;

  const [, label, target] = link;
  return <Link key={key} className={link_class_name} to={target}>{label}</Link>;
}

export function AgentText({ text, className, link_class_name }: { text: string; className?: string; link_class_name?: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => part ? renderToken(part, `agent-text-${index}`, link_class_name) : null)}
    </span>
  );
}
