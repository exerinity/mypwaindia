import { useEffect, useRef } from 'react';
import fluidPlayer from 'fluid-player';
import 'fluid-player/src/css/fluidplayer.css';

function videoType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'm4v') return 'video/x-m4v';
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'ogv') return 'video/ogg';
  if (extension === 'webm') return 'video/webm';
  return 'video/mp4';
}

export default function FluidVideoPlayer({ src, path }: { src: string; path: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const video = document.createElement('video');
    video.playsInline = true;
    const source = document.createElement('source');
    source.src = src;
    source.type = videoType(path);
    video.appendChild(source);
    host.replaceChildren(video);

    const player = fluidPlayer(video, {
      layoutControls: {
        fillToContainer: true,
        preload: 'metadata',
        allowDownload: false,
        playbackRateEnabled: true,
      },
    });

    return () => {
      player.destroy();
      host.replaceChildren();
    };
  }, [src, path]);

  return <div ref={hostRef} style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }} />;
}
