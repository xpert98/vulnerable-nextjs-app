import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { formatDateTime } from '@/lib/format';
import CommentForm from '@/components/CommentForm';
import DeleteNoteButton from '@/components/DeleteNoteButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Note #${id}` };
}

export default async function NotePage({ params }) {
  const { id } = await params;
  const session = await getSession();

  let note = null;
  let comments = [];
  let related = [];
  let error = '';
  let executedQuery = '';

  try {
    // INTENTIONALLY VULNERABLE (testbed): the route parameter is
    // interpolated directly. This enables SQL injection and, because there
    // is no visibility/owner predicate, direct access to private notes.
    executedQuery = `SELECT n.*, u.username, u.display_name, u.role
       FROM notes n
       JOIN users u ON u.id = n.user_id
      WHERE n.id = ${id}
      LIMIT 1`;

    const { rows } = await pool.query(executedQuery);
    note = rows[0] || null;

    if (note) {
      const [commentRows, relatedRows] = await Promise.all([
        pool.query(
          `SELECT c.*, u.username, u.display_name
             FROM comments c
             JOIN users u ON u.id = c.user_id
            WHERE c.note_id = $1
            ORDER BY c.created_at ASC`,
          [note.id],
        ),
        pool.query(
          `SELECT n.id, n.title, n.body, n.visibility, n.attachment, n.created_at,
                  u.username, u.display_name
             FROM notes n
             JOIN users u ON u.id = n.user_id
            WHERE n.visibility = 'public' AND n.id <> $1
            ORDER BY n.created_at DESC
            LIMIT 3`,
          [note.id],
        ),
      ]);
      comments = commentRows.rows;
      related = relatedRows.rows;
    }
  } catch (err) {
    error = err.message;
  }

  if (!note && !error) {
    notFound();
  }

  return (
    <>
      <p className="small">
        <Link href="/search">← Back to explore</Link>
      </p>

      {error ? (
        <div className="notice notice-danger">
          <strong>Note lookup failed:</strong>
          <pre className="code-block">{error}</pre>
          {executedQuery ? (
            <details>
              <summary className="small">Show executed SQL</summary>
              <pre className="code-block">{executedQuery}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {note ? (
        <div className="two-col">
          <div>
            <article className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                <span
                  className={`badge ${
                    note.visibility === 'private' ? 'badge-private' : 'badge-public'
                  }`}
                >
                  {note.visibility}
                </span>
                <span className="badge badge-neutral">note #{note.id}</span>
                {note.attachment ? (
                  <span className="badge badge-neutral">attachment</span>
                ) : null}
                <span className="muted small">
                  {formatDateTime(note.created_at)}
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(30px, 4vw, 44px)' }}>{note.title}</h1>

              <div className="member-top" style={{ margin: '16px 0 20px' }}>
                <span className="avatar">
                  {(note.display_name || note.username || '?')[0].toUpperCase()}
                </span>
                <div>
                  <strong>
                    <Link href={`/profile?user=${encodeURIComponent(note.username)}`}>
                      @{note.username}
                    </Link>
                  </strong>
                  <div className="muted small">
                    {note.display_name} · {note.role}
                  </div>
                </div>
              </div>

              {/* INTENTIONALLY VULNERABLE (testbed): stored HTML/XSS sink. */}
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: note.body || '' }}
              />

              {note.attachment ? (
                <div className="notice" style={{ marginTop: 20, marginBottom: 0 }}>
                  <strong>Attachment:</strong>{' '}
                  <a
                    href={`/api/files/download?name=${encodeURIComponent(
                      note.attachment,
                    )}`}
                  >
                    {note.attachment}
                  </a>
                  <div className="muted tiny">
                    Served by the download endpoint, which resolves the name as a
                    filesystem path.
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <Link
                  className="btn btn-ghost btn-sm"
                  href={`/search?q=${encodeURIComponent(note.title)}`}
                >
                  Find similar
                </Link>
                {session ? (
                  <DeleteNoteButton
                    noteId={note.id}
                    redirectTo={session.uid === note.user_id ? '/dashboard' : null}
                  />
                ) : (
                  <Link className="btn btn-ghost btn-sm" href="/login">
                    Sign in to reply
                  </Link>
                )}
              </div>
            </article>

            <div className="section-heading">
              <h2>Replies</h2>
              <span className="muted small">{comments.length} total</span>
            </div>

            <div className="comment-list">
              {comments.map((comment) => (
                <article className="comment" key={comment.id}>
                  <div className="comment-meta">
                    <span className="avatar" style={{ width: 26, height: 26, fontSize: 12 }}>
                      {(comment.display_name || comment.username || '?')[0].toUpperCase()}
                    </span>
                    <strong>@{comment.username}</strong>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>
                  {/* INTENTIONALLY VULNERABLE (testbed): stored XSS sink. */}
                  <div
                    className="comment-body"
                    dangerouslySetInnerHTML={{ __html: comment.body || '' }}
                  />
                </article>
              ))}

              {comments.length === 0 ? (
                <div className="empty">No replies yet. Be the first.</div>
              ) : null}
            </div>
          </div>

          <aside className="sidebar">
            <div className="card">
              <h3>Reply to this note</h3>
              {session ? (
                <CommentForm noteId={note.id} />
              ) : (
                <>
                  <p className="muted small">
                    Sign in with Keycloak to join the thread.
                  </p>
                  <Link className="btn btn-primary btn-sm" href="/login">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <div className="card">
              <h3>Note metadata</h3>
              <dl className="meta-list">
                <div>
                  <dt>Author</dt>
                  <dd>@{note.username}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>{note.visibility}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDateTime(note.created_at)}</dd>
                </div>
                <div>
                  <dt>Record ID</dt>
                  <dd>{note.id}</dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h3>More public notes</h3>
              <div className="stack">
                {related.map((item) => (
                  <Link
                    className="small"
                    href={`/notes/${item.id}`}
                    key={item.id}
                  >
                    {item.title}
                  </Link>
                ))}
                {related.length === 0 ? (
                  <span className="muted small">Nothing else yet.</span>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
