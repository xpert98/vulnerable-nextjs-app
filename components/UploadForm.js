'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      setStatus({ kind: 'error', text: 'Pick a file first.' });
      return;
    }

    setBusy(true);
    setStatus({ kind: 'info', text: 'Uploading…' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name) formData.append('name', name);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          kind: 'error',
          text: data.error || `Upload failed (${response.status})`,
        });
        return;
      }

      setStatus({
        kind: 'ok',
        text: `Saved to ${data.path} (${data.size} bytes).`,
      });
      setFile(null);
      setName('');
      event.target.reset();
      router.refresh();
    } catch (error) {
      setStatus({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="upload-file">File</label>
        <input
          id="upload-file"
          className="input"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <span className="muted tiny">
          No type, size, or content checks. Filenames are used as paths.
        </span>
      </div>

      <div className="field">
        <label htmlFor="upload-name">Override stored filename (optional)</label>
        <input
          id="upload-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. diagram.html"
        />
      </div>

      {status ? (
        <p
          className={`form-status ${
            status.kind === 'ok'
              ? 'status-ok'
              : status.kind === 'error'
                ? 'status-error'
                : 'status-info'
          }`}
        >
          {status.text}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload to library'}
        </button>
      </div>
    </form>
  );
}
