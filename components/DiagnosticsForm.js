'use client';

import { useState } from 'react';

export default function DiagnosticsForm() {
  const [host, setHost] = useState('example.com');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ host }),
      });
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
          <label htmlFor="diag-host">Host to resolve</label>
          <input
            id="diag-host"
            className="input"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="example.com"
          />
          <span className="muted tiny">
            Passed to <code>nslookup</code> on the server.
          </span>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
            {busy ? 'Running…' : 'Run diagnostic'}
          </button>
        </div>
      </form>

      {result ? (
        <pre className="preview-result">{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}
