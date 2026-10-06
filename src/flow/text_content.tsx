import type { TextContentSubtask } from '../api/flow.ts';
import { usePageTitle } from '../hooks/page_title.js';

export default function TextContent({ subtask }: { subtask: TextContentSubtask }) {
  const { primary_text, paragraphs } = subtask.text_content;
  usePageTitle(primary_text.text);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} style={{ margin: 0 }}>{paragraph.text}</p>
      ))}
    </div>
  );
}