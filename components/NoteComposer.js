'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NoteComposer() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    body: '',
    visibility: 'public',
  });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus({ kind: 'info', text: 'Publishing…' });

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          kind: 'error',
          text: data.error || `Publish failed (${response.status})`,
        });
        return;
      }

      setForm({ title: '', body: '', visibility: 'public' });
      setStatus({
        kind: 'ok',
        text: `Note #${data.note?.id ?? '?'} published. HTML is rendered as-is.`,
      });
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
        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          className="input"
          value={form.title}
          onChange={update('title')}
          placeholder="What did you learn?"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="note-body">Note</label>
        <textarea
          id="note-body"
          className="textarea"
          rows={7}
          value={form.body}
          onChange={update('body')}
          placeholder="Markdown-ish HTML is welcome: <p>, <code>, <strong>…"
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="note-visibility">Visibility</label>
          <select
            id="note-visibility"
            className="select"
            value={form.visibility}
            onChange={update('visibility')}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Rendering</span>
          <div className="input" style={{ background: 'var(--paper)' }}>
            HTML is rendered without sanitization.
          </div>
        </div>
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
          {busy ? 'Publishing…' : 'Publish note'}
        </button>
      </div>
    </form>
  );
}
