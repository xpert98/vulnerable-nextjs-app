'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CommentForm({ noteId }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;

    setBusy(true);
    setStatus({ kind: 'info', text: 'Posting…' });

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ noteId, body }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          kind: 'error',
          text: data.error || `Comment failed (${response.status})`,
        });
        return;
      }

      setBody('');
      setStatus({ kind: 'ok', text: 'Reply posted.' });
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
        <label htmlFor={`comment-${noteId}`}>Add a reply</label>
        <textarea
          id={`comment-${noteId}`}
          className="textarea"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="HTML is accepted here too…"
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
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
          {busy ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  );
}
