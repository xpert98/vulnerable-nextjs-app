'use client';

import { useState } from 'react';

export default function PreviewForm() {
  const [url, setUrl] = useState(
    'http://keycloak:8080/realms/beacon/.well-known/openid-configuration',
  );
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/preview?url=${encodeURIComponent(url)}`,
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => ({}));
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="preview-url">URL to preview</label>
          <input
            id="preview-url"
            className="input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://internal-service/…"
          />
          <span className="muted tiny">
            The server fetches this URL and returns the body.
          </span>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary btn-sm" type="submit" disabled={busy}>
            {busy ? 'Fetching…' : 'Fetch preview'}
          </button>
        </div>
      </form>

      {result ? (
        <pre className="preview-result">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
