import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import {
  deleteDriveFile,
  driveDownloadUrl,
  getDriveDownloadToken,
  getDriveUser,
  listDriveFiles,
  renameDriveFile,
  shareDriveFile,
  unshareDriveFile,
  type DriveFile,
  type DriveUser,
} from '../../api/drive.ts';
import { Empty, ErrorBox, Skeleton } from '../../components/ui/status.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { CopyIcon } from '../../components/ui/icons.tsx';
import { drivePathError, drivePreviewRoute, fileName, formatBytes, formatDriveDate } from './drive_helpers.ts';

export default function DrivePage() {
  usePageTitle('Drive');
  const { active } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [working, setWorking] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null);
  const [renamePath, setRenamePath] = useState('');
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [unshareTarget, setUnshareTarget] = useState<DriveFile | null>(null);
  const [trashTarget, setTrashTarget] = useState<DriveFile | null>(null);

  const filesQuery = useCachedQuery<DriveFile[]>(
    active ? `drive-files:${active.id}` : null,
    () => listDriveFiles(active!.token),
    [active?.token],
    { skip: !active }
  );
  const userQuery = useCachedQuery<DriveUser>(
    active ? `drive-user:${active.id}` : null,
    () => getDriveUser(active!.token),
    [active?.token],
    { skip: !active }
  );
  const files = useMemo(
    () => (filesQuery.data ?? []).filter((file) => !file.trashed_at).sort((a, b) => b.modified_at.localeCompare(a.modified_at)),
    [filesQuery.data]
  );

  async function downloadFile(file: DriveFile) {
    const action = `download:${file.path}`;
    setWorking(action);
    try {
      const token = await getDriveDownloadToken(active!.token, file.path);
      const link = document.createElement('a');
      link.href = driveDownloadUrl(token);
      link.download = fileName(file.path);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the file...');
    } finally {
      setWorking(null);
    }
  }

  function beginRename(file: DriveFile) {
    setRenameTarget(file);
    setRenamePath(file.path);
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    const pathError = drivePathError(renamePath);
    if (!renameTarget || pathError || renamePath.trim() === renameTarget.path) {
      if (pathError) toast.error(pathError);
      return;
    }
    setWorking(`rename:${renameTarget.path}`);
    try {
      await renameDriveFile(active!.token, renameTarget.path, renamePath.trim());
      toast.success('File renamed');
      setRenameTarget(null);
      await filesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename the file');
    } finally {
      setWorking(null);
    }
  }

  async function openShare(file: DriveFile) {
    setWorking(`share:${file.path}`);
    try {
      const uuid = file.share_uuid || await shareDriveFile(active!.token, file.path);
      setShareTarget({ ...file, share_uuid: uuid });
      setShareUrl(`${window.location.origin}/share/${encodeURIComponent(uuid)}`);
      if (!file.share_uuid) await filesQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share the file');
    } finally {
      setWorking(null);
    }
  }

  async function stopSharing(file: DriveFile) {
    if (!file.share_uuid) return;
    setUnshareTarget(null);
    setShareTarget(null);
    setWorking(`unshare:${file.path}`);
    try {
      await unshareDriveFile(active!.token, file.share_uuid);
      setShareUrl('');
      toast.success('File is no longer shared');
      await filesQuery.refetch();
    } catch (error) {
      await filesQuery.refetch();
      toast.error(error instanceof Error ? error.message : 'Could not stop sharing the file');
    } finally {
      setWorking(null);
    }
  }

  async function copyShareLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  async function moveToTrash(file: DriveFile) {
    setTrashTarget(null);
    setWorking(`trash:${file.path}`);
    try {
      await deleteDriveFile(active!.token, file.path);
      toast.success('OK, moved that file to trash');
      await Promise.all([filesQuery.refetch(), userQuery.refetch()]);
    } catch (error) {
      await filesQuery.refetch();
      toast.error(error instanceof Error ? error.message : 'Could not move the file to trash');
    } finally {
      setWorking(null);
    }
  }

  const drivePortalShareUrl = shareTarget?.share_uuid
    ? `https://drive.mypayindia.com/share/${encodeURIComponent(shareTarget.share_uuid)}`
    : '';

  return (
    <>
      <Modal className="slide" open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename file">
        <form onSubmit={submitRename}>
          <FloatingInput
            id="drive-rename-path"
            label="File path"
            type="text"
            value={renamePath}
            onChange={(event) => setRenamePath(event.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setRenameTarget(null)}>Cancel</button>
            <button type="submit" disabled={!renamePath.trim() || renamePath.trim() === renameTarget?.path || working !== null}>
              {working?.startsWith('rename:') ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal className="slide" open={!!shareTarget} onClose={() => setShareTarget(null)} title="Share file">
        <p className="mt-0">Anyone with this link can view and download {shareTarget ? fileName(shareTarget.path) : 'this file'}</p>
        <FloatingInput
          id="drive-portal-share-url"
          label="MyDriveIndia link"
          type="url"
          value={drivePortalShareUrl}
          readOnly
          onFocus={(event) => event.target.select()}
          trailing={
            <button type="button" onClick={() => copyShareLink(drivePortalShareUrl)} aria-label="Copy drive.mypayindia.com link" title="Copy drive.mypayindia.com link">
              <CopyIcon />
            </button>
          }
        />
        <FloatingInput
          id="drive-share-url"
          label="MyPWAIndia link"
          type="url"
          value={shareUrl}
          readOnly
          onFocus={(event) => event.target.select()}
          trailing={
            <button type="button" onClick={() => copyShareLink(shareUrl)} aria-label="Copy share link" title="Copy share link">
              <CopyIcon />
            </button>
          }
        />
        <div className="modal-actions">
          <button className="secondary" onClick={() => setShareTarget(null)}>Close</button>
          {shareTarget?.share_uuid && (
            <button
              className="danger"
              onClick={() => {
                setUnshareTarget(shareTarget);
                setShareTarget(null);
              }}
            >
              Stop sharing
            </button>
          )}
        </div>
      </Modal>
      <ConfirmModal
        open={!!unshareTarget}
        onClose={() => setUnshareTarget(null)}
        onConfirm={() => unshareTarget && stopSharing(unshareTarget)}
        title="Really stop sharing file?"
        message={unshareTarget ? `Stop sharing ${fileName(unshareTarget.path)}?` : ''}
        className="slide"
      />
      <ConfirmModal
        open={!!trashTarget}
        onClose={() => setTrashTarget(null)}
        onConfirm={() => trashTarget && moveToTrash(trashTarget)}
        title="Really trash file?"
        message={trashTarget ? `Move ${fileName(trashTarget.path)} to trash?` : ''}
        className="slide"
      />

      <h1 className="mt-0">Drive</h1>
      {userQuery.data && (
        <p className="mb-0 mt-0">
          {formatBytes(userQuery.data.space_used)} used with {formatBytes(userQuery.data.space_available)} allocated
          {' '}({userQuery.data.space_available > 0 ? Math.round((userQuery.data.space_used / userQuery.data.space_available) * 100) : 0}%).
          {' '}{formatBytes(Math.max(userQuery.data.space_available - userQuery.data.space_used, 0))} left
          {' '}({userQuery.data.space_available > 0 ? Math.round((Math.max(userQuery.data.space_available - userQuery.data.space_used, 0) / userQuery.data.space_available) * 100) : 0}%)
        </p>
      )}

      {filesQuery.loading && !filesQuery.data ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Size</th><th>Modified</th><th>Actions</th></tr></thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td><Skeleton width={180} /></td>
                  <td><Skeleton width={62} /></td>
                  <td><Skeleton width={145} /></td>
                  <td><Skeleton width={310} height={28} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filesQuery.error ? (
        <ErrorBox error={filesQuery.error} />
      ) : files.length === 0 ? (
        <Empty>No files in your drive yet!</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Size</th><th>Modified</th><th>Actions</th></tr>
            </thead>
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
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDriveDate(file.modified_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                      <button className="secondary compact" onClick={() => downloadFile(file)} disabled={working !== null}>
                        {working === `download:${file.path}` ? <><span className="spinner" /> Downloading...</> : 'Download'}
                      </button>
                      <button className="secondary compact" onClick={() => beginRename(file)} disabled={working !== null}>Rename</button>
                      <button className="secondary compact" onClick={() => openShare(file)} disabled={working !== null}>
                        {working === `share:${file.path}` ? 'Sharing...' : file.share_uuid ? 'Manage share' : 'Share'}
                      </button>
                      <button className="danger compact" onClick={() => setTrashTarget(file)} disabled={working !== null}>
                        {working === `trash:${file.path}` ? 'Trashing...' : 'Trash'}
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
