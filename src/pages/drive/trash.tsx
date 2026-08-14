import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  deleteDriveFile,
  driveDownloadUrl,
  getDriveDownloadToken,
  listDriveFiles,
  restoreDriveFiles,
  type DriveFile,
} from '../../api/drive.ts';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { Empty, ErrorBox, Skeleton } from '../../components/ui/status.tsx';
import { drivePreviewRoute, fileName, formatBytes, formatDriveDate } from './drive_helpers.ts';

export default function DriveTrashPage() {
  usePageTitle('Drive trash');
  const { active } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [working, setWorking] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null);
  const filesQuery = useCachedQuery<DriveFile[]>(
    active ? `drive-trash:${active.id}` : null,
    () => listDriveFiles(active!.token),
    [active?.token],
    { skip: !active }
  );
  const files = useMemo(
    () => (filesQuery.data ?? []).filter((file) => !!file.trashed_at).sort((a, b) => (b.trashed_at ?? '').localeCompare(a.trashed_at ?? '')),
    [filesQuery.data]
  );

  async function downloadFile(file: DriveFile) {
    setWorking(`download:${file.path}`);
    try {
      const token = await getDriveDownloadToken(active!.token, file.path);
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

  async function restoreFile(file: DriveFile) {
    setWorking(`restore:${file.path}`);
    try {
      await restoreDriveFiles(active!.token, [file.path]);
      toast.success('File restored');
      await filesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore the file');
    } finally {
      setWorking(null);
    }
  }

  async function restoreAll() {
    if (!files.length) return;
    setWorking('restore-all');
    try {
      await restoreDriveFiles(active!.token, files.map((file) => file.path));
      toast.success('All files restored');
      await filesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore the files');
    } finally {
      setWorking(null);
    }
  }

  async function permanentlyDelete(file: DriveFile) {
    setDeleteTarget(null);
    setWorking(`delete:${file.path}`);
    try {
      await deleteDriveFile(active!.token, file.path);
      toast.success('File permanently deleted');
      await filesQuery.refetch();
    } catch (error) {
      await filesQuery.refetch();
      toast.error(error instanceof Error ? error.message : 'Could not delete the file');
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && permanentlyDelete(deleteTarget)}
        title="Permanently delete file"
        message={deleteTarget ? `Permanently delete ${fileName(deleteTarget.path)}? This cannot be undone.` : ''}
        confirmLabel="Delete forever"
        holdConfirm
        className="slide"
      />

      <div className="team-heading-row">
        <h1 className="mt-0">Trash</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {files.length > 0 && (
            <button className="secondary compact" onClick={restoreAll} disabled={working !== null}>
              {working === 'restore-all' ? 'Restoring...' : 'Restore all'}
            </button>
          )}
          <Link to="/i/drive" className="btn secondary compact">Back</Link>
        </div>
      </div>

      {filesQuery.loading && !filesQuery.data ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Size</th><th>Trashed</th><th>Actions</th></tr></thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, index) => (
                <tr key={index}>
                  <td><Skeleton width={180} /></td>
                  <td><Skeleton width={62} /></td>
                  <td><Skeleton width={145} /></td>
                  <td><Skeleton width={280} height={28} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filesQuery.error ? (
        <ErrorBox error={filesQuery.error} />
      ) : files.length === 0 ? (
        <Empty>Trash is empty!</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Size</th><th>Trashed</th><th>Actions</th></tr></thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path}>
                  <td>
                    <Link
                      className="drive-file-link"
                      to={drivePreviewRoute(file.path)}
                      state={{ backgroundLocation: location }}
                    >
                      {fileName(file.path)}
                    </Link>
                    {file.path !== fileName(file.path) && <div className="muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>{file.path}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatBytes(file.size)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDriveDate(file.trashed_at ?? '')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                      <button className="secondary compact" onClick={() => downloadFile(file)} disabled={working !== null}>
                        {working === `download:${file.path}` ? <><span className="spinner" /> Downloading...</> : 'Download'}
                      </button>
                      <button className="secondary compact" onClick={() => restoreFile(file)} disabled={working !== null}>
                        {working === `restore:${file.path}` ? 'Restoring...' : 'Restore'}
                      </button>
                      <button className="danger compact" onClick={() => setDeleteTarget(file)} disabled={working !== null}>
                        {working === `delete:${file.path}` ? 'Deleting...' : 'Delete forever'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
