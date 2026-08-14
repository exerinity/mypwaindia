import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  driveDownloadUrl,
  getSharedDriveDownloadToken,
  getSharedDriveFile,
  type SharedDriveFile,
} from '../../api/drive.ts';
import { useToast } from '../../context/toast_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { ErrorBox, Skeleton } from '../../components/ui/status.tsx';
import { ExternalIcon } from '../../components/ui/icons.tsx';
import { fileName, formatBytes, previewKind, sharedDrivePreviewRoute } from './drive_helpers.ts';

export default function DriveSharePage() {
  usePageTitle('Shared file');
  const { uuid = '' } = useParams();
  const toast = useToast();
  const location = useLocation();
  const [working, setWorking] = useState<'download' | null>(null);
  const fileQuery = useCachedQuery<SharedDriveFile>(
    uuid ? `drive-share:${uuid}` : null,
    () => getSharedDriveFile(uuid),
    [uuid],
    { skip: !uuid }
  );

  async function downloadFile(file: SharedDriveFile['file']) {
    setWorking('download');
    try {
      const token = await getSharedDriveDownloadToken(uuid, file.path);
      const link = document.createElement('a');
      link.href = driveDownloadUrl(token);
      link.download = fileName(file.path);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the file');
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <h1 className="mt-0">Shared file</h1>
      {fileQuery.loading && !fileQuery.data ? (
        <div className="card">
          <Skeleton width={220} height={20} />
          <Skeleton width={120} style={{ marginTop: 10 }} />
          <Skeleton width={180} height={32} style={{ marginTop: 18 }} />
        </div>
      ) : fileQuery.error ? (
        <ErrorBox error={fileQuery.error} />
      ) : fileQuery.data ? (
        <div className="card">
          <h2 className="mt-0">{fileName(fileQuery.data.file.path)}</h2>
          <p className="muted">Shared by {fileQuery.data.username} - {formatBytes(fileQuery.data.file.size)}</p>
          <div className="btn-row">
            {previewKind(fileQuery.data.file.path) && (
              <Link
                className="btn secondary"
                to={sharedDrivePreviewRoute(uuid, fileQuery.data.file.path)}
                state={{ backgroundLocation: location }}
              >
                Preview
              </Link>
            )}
            <button onClick={() => downloadFile(fileQuery.data!.file)} disabled={working !== null}>
              {working === 'download' ? <><span className="spinner" /> Downloading...</> : 'Download'}
            </button>
            <a href={`https://drive.mypayindia.com/share/${encodeURIComponent(uuid)}`} target="_blank" rel="noopener noreferrer" className="btn secondary">
              View on MyDriveIndia <ExternalIcon />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
