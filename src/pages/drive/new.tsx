import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadDriveFile } from '../../api/drive.ts';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.js';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { drivePathError, formatBytes } from './drive_helpers.ts';

export default function DriveUploadPage() {
  usePageTitle('Upload to Drive');
  const { active } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [filepath, setFilepath] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    if (nextFile) setFilepath(nextFile.name);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const pathError = drivePathError(filepath);
    if (!file || pathError) {
      if (pathError) toast.error(pathError);
      return;
    }
    setUploading(true);
    try {
      await uploadDriveFile(active!.token, file, filepath.trim());
      toast.success('OK, file uploaded');
      navigate('/i/drive', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the file');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <h1 className="mt-0">Upload file</h1>
      <form onSubmit={submit} className="card mb-2">
        <label htmlFor="drive-upload-file">File</label>
        <input
          ref={fileInputRef}
          id="drive-upload-file"
          type="file"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          disabled={uploading}
          hidden
        />
        <div className="btn-row">
          <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>Choose file</button>
          {file && <span className="muted">{file.name}, {formatBytes(file.size)}</span>}
        </div>

        <FloatingInput
          id="drive-upload-path"
          label="File path"
          type="text"
          value={filepath}
          onChange={(event) => setFilepath(event.target.value)}
          disabled={uploading}
        />
        <p className="muted">Use the file name alone or include folders in the path</p>

        <div className="btn-row mt-2">
          <Link to="/i/drive" className="btn secondary">Cancel</Link>
          <button type="submit" disabled={!file || !filepath.trim() || uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </>
  );
}
