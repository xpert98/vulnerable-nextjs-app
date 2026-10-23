'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({ user }) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: user.display_name || '',
    email: user.email || '',
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
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
    setStatus({ kind: 'info', text: 'Saving…' });

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          kind: 'error',
          text: data.error || `Save failed (${response.status})`,
        });
        return;
      }

      setStatus({ kind: 'ok', text: 'Profile updated.' });
      router.refresh();
    } catch (error) {
      setStatus({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            className="input"
            value={form.display_name}
            onChange={update('display_name')}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            className="input"
            type="email"
            value={form.email}
            onChange={update('email')}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="profile-bio">Bio</label>
        <textarea
          id="profile-bio"
          className="textarea"
          rows={3}
          value={form.bio}
          onChange={update('bio')}
        />
      </div>

      <div className="field">
        <label htmlFor="profile-avatar">Avatar URL</label>
        <input
          id="profile-avatar"
          className="input"
          value={form.avatar_url}
          onChange={update('avatar_url')}
          placeholder="https://…"
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
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        <span className="muted tiny">
          The API updates every recognised field in the request, including role.
        </span>
      </div>
    </form>
  );
}
