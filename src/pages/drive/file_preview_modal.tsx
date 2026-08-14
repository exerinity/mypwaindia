import { lazy, Suspense } from 'react';
import { Modal } from '../../components/ui/modal.tsx';
import { ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { fileName, type PreviewKind } from './drive_helpers.ts';

const FluidVideoPlayer = lazy(() => import('./fluid_video_player.tsx'));

export interface DrivePreview {
  path: string;
  kind: PreviewKind;
  url: string;
}

export function FilePreviewModal({
  path,
  preview,
  loading,
  error,
  onClose,
}: {
  path: string;
  preview: DrivePreview | null;
  loading: boolean;
  error: unknown;
  onClose: () => void;
}) {
  return (
    <Modal className="slide" open onClose={onClose} title={fileName(path)}>
      {loading && !preview ? (
        <LoadingRow>Retrieving file...</LoadingRow>
      ) : error ? (
        <ErrorBox error={error} />
      ) : preview?.kind === 'image' ? (
        <img
          src={preview.url}
          alt={fileName(preview.path)}
          style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '72vh', margin: '0 auto', objectFit: 'contain' }}
        />
      ) : preview?.kind === 'audio' ? (
        <audio
          key={preview.url}
          src={preview.url}
          controls
          autoPlay
          preload="metadata"
          style={{ display: 'block', width: '100%' }}
        />
      ) : preview?.kind === 'video' ? (
        <Suspense fallback={<div className="loading-row"><span className="spinner lg" /><span>Loading player...</span></div>}>
          <FluidVideoPlayer key={preview.url} src={preview.url} path={preview.path} />
        </Suspense>
      ) : null}
    </Modal>
  );
}
