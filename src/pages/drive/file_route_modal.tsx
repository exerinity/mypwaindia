import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  driveDownloadUrl,
  getDriveDownloadToken,
  getSharedDriveDownloadToken,
  getSharedDriveFile,
} from '../../api/drive.ts';
import { useAuth } from '../../context/auth_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { fileName, previewKind } from './drive_helpers.ts';
import { FilePreviewModal, type DrivePreview } from './file_preview_modal.tsx';

export default function DriveFileRouteModal({ shared = false, shareUuid = '' }: { shared?: boolean; shareUuid?: string }) {
  const { active } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const path = params['*'] ?? '';
  const uuid = shareUuid || params.uuid || '';
  const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;
  const [preview, setPreview] = useState<DrivePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  
  useEffect(() => {
    let cancelled = false;
    const kind = previewKind(path);
    setPreview(null);
    setError(null);
    setLoading(true);

    if (!kind) {
      setError(new Error('This file type cannot be previewed!'));
      setLoading(false);
      return;
    }
    const previewType = kind;

    async function openFile() {
      try {
        let token: string;
        if (shared) {
          const sharedFile = await getSharedDriveFile(uuid);
          if (sharedFile.file.path !== path) throw new Error('This file is not part of the shared link!');
          token = await getSharedDriveDownloadToken(uuid, path);
        } else {
          token = await getDriveDownloadToken(active!.token, path);
        }
        if (!cancelled) {
          setPreview({ path, kind: previewType, url: driveDownloadUrl(token, true) });
        }
      } catch (nextError) {
        if (!cancelled) setError(nextError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    openFile();
    return () => {
      cancelled = true;
    };
  }, [active?.token, path, shared, uuid]);

  function close() {
    if (backgroundLocation) {
      navigate(-1);
    } else {
      navigate(shared ? `/i/drive/share/${encodeURIComponent(uuid)}` : '/i/drive', { replace: true });
    }
  }

  return <FilePreviewModal path={path} preview={preview} loading={loading} error={error} onClose={close} />;
}
