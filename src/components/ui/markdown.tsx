import type { ReactNode } from 'react';

type BlockType = 'p' | 'ul' | 'ol' | 'code' | 'quote' | 'h';

interface Block {
  type: BlockType;
  lines: string[];
}

const INLINE_RE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|~~[^~\n]+~~|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/;
const BLOCK_START_RE = /^\s*(```|[-*+]\s|\d+[.)]\s|>|#{1,6}\s)/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(INLINE_RE).forEach((part, index) => {
    if (!part) return;
    const key = `${keyPrefix}-${index}`;
    if (part.length > 4 && ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__')))) {
      out.push(<strong key={key}>{part.slice(2, -2)}</strong>);
      return;
    }
    if (part.length > 4 && part.startsWith('~~') && part.endsWith('~~')) {
      out.push(<s key={key}>{part.slice(2, -2)}</s>);
      return;
    }
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      out.push(<em key={key}>{part.slice(1, -1)}</em>);
      return;
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      out.push(<code key={key}>{part.slice(1, -1)}</code>);
      return;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      out.push(<a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>);
      return;
    }
    out.push(<span key={key}>{part}</span>);
  });
  return out;
}

function renderLines(lines: string[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) out.push(<br key={`${keyPrefix}-br-${index}`} />);
    out.push(...renderInline(line, `${keyPrefix}-${index}`));
  });
  return out;
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lines: body });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'h', lines: [heading[1]] });
      i += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', lines: items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', lines: items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quoted });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START_RE.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', lines: paragraph });
  }

  return blocks;
}

export function Markdown({ text, className = 'md' }: { text: string; className?: string }) {
  if (!text) return null;
  const blocks = parseBlocks(text);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        if (block.type === 'code') return <pre key={key}><code>{block.lines.join('\n')}</code></pre>;
        if (block.type === 'h') return <div key={key} className="md-h">{renderInline(block.lines[0], key)}</div>;
        if (block.type === 'quote') return <blockquote key={key}>{renderLines(block.lines, key)}</blockquote>;
        if (block.type === 'ul') {
          return <ul key={key}>{block.lines.map((item, i) => <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>)}</ul>;
        }
        if (block.type === 'ol') {
          return <ol key={key}>{block.lines.map((item, i) => <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>)}</ol>;
        }
        return <p key={key}>{renderLines(block.lines, key)}</p>;
      })}
    </div>
  );
}
