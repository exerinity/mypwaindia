import { news_classes } from '../styles/news.stylex.ts';
import type { ImageSubtask } from '../api/flow.ts';

export default function FlowImage({ subtask }: { subtask: ImageSubtask }) {
  return (
    <div className={`news-body ${news_classes.body}`}>
      <img
        src={subtask.image.url}
        alt={subtask.image.alt}
        loading="eager"
      />
    </div>
  );
}
