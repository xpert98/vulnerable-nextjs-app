import Link from 'next/link';
import { pool } from '@/lib/db';
import { formatBytes, formatDateTime } from '@/lib/format';
import UploadForm from '@/components/UploadForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Library' };

export default async function FilesPage() {
  let files = [];
  let error = '';

  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.username
         FROM attachments a
         LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT 50`,
    );
    files = rows;
  } catch (err) {
    error = err.message;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Shared library</span>
          <h1>Files &amp; artifacts</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Diagrams, checklists, exports, and whatever else the community
            drops in. Stored on the app container and served by name.
          </p>
        </div>
      </div>

      {error ? (
        <div className="notice notice-danger">
          <strong>Library query failed:</strong> {error}
        </div>
      ) : null}

      <div className="two-col">
        <div>
          <div className="section-heading" style={{ marginTop: 0 }}>
            <h2>Fresh uploads</h2>
            <span className="muted small">{files.length} files</span>
          </div>

          {files.length ? (
            <div className="file-list">
              {files.map((file) => (
                <div className="file-row" key={file.id}>
                  <span className="file-icon" aria-hidden="true">
                    ▤
                  </span>
                  <div className="file-main">
                    <strong>{file.original_name}</strong>
                    <div className="muted tiny">
                      {file.mime_type || 'application/octet-stream'} ·{' '}
                      {formatBytes(file.size_bytes)} · {formatDateTime(file.created_at)}
                      {file.username ? ` · @${file.username}` : ''}
                    </div>
                  </div>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`/api/files/download?name=${encodeURIComponent(
                      file.stored_name,
                    )}`}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Nothing here yet. Upload the first file.</div>
          )}

          <div className="notice notice-warn" style={{ marginTop: 18 }}>
            <strong>Testbed note:</strong> downloads resolve the <code>name</code>{' '}
            parameter as a filesystem path. Absolute paths are accepted.
          </div>
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>Upload a file</h3>
            <p className="muted small">
              Any type, any size, any filename. The upload endpoint writes to
              disk and records the path.
            </p>
            <UploadForm />
          </div>

          <div className="card">
            <h3>Download by name</h3>
            <p className="muted small" style={{ marginBottom: 6 }}>
              The list above links to:
            </p>
            <pre className="code-block" style={{ marginBottom: 0 }}>
{`GET /api/files/download?name=welcome.txt`}
            </pre>
          </div>

          <div className="card">
            <h3>Related</h3>
            <div className="stack">
              <Link className="btn btn-ghost btn-sm" href="/search">
                Search notes
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/dashboard">
                Your dashboard
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
