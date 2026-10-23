'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteNoteButton({ noteId, redirectTo }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm('Delete this note? There is no ownership check.')) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || `Delete failed (${response.status})`);
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        className="btn btn-danger btn-sm"
        type="button"
        onClick={remove}
        disabled={busy}
      >
        {busy ? 'Deleting…' : 'Delete note'}
      </button>
      {error ? <span className="small" style={{ color: 'var(--danger)' }}>{error}</span> : null}
    </span>
  );
}
