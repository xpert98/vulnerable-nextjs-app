import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { getCurrentUser, getSession } from '@/lib/session';
import { formatDate } from '@/lib/format';
import NoteCard from '@/components/NoteCard';
import NoteComposer from '@/components/NoteComposer';
import DeleteNoteButton from '@/components/DeleteNoteButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?returnTo=/dashboard');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?returnTo=/dashboard');
  }

  let notes = [];
  let stats = { total: 0, private: 0, public: 0, replies: 0 };
  let dbError = '';

  try {
    const [noteRows, replyRows] = await Promise.all([
      pool.query(
        `SELECT n.*, u.username, u.display_name
           FROM notes n
           JOIN users u ON u.id = n.user_id
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC`,
        [user.id],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
           FROM comments c
           JOIN notes n ON n.id = c.note_id
          WHERE n.user_id = $1`,
        [user.id],
      ),
    ]);

    notes = noteRows.rows;
    stats = {
      total: notes.length,
      private: notes.filter((note) => note.visibility === 'private').length,
      public: notes.filter((note) => note.visibility === 'public').length,
      replies: replyRows.rows[0]?.count || 0,
    };
  } catch (error) {
    dbError = error.message;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Your corner of Beacon</span>
          <h1>Dashboard</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Signed in as <strong>@{user.username}</strong> · {user.display_name} ·{' '}
            <span className={`badge badge-${user.role === 'admin' ? 'admin' : 'member'}`}>
              {user.role}
            </span>
          </p>
        </div>
        <Link className="btn btn-ghost" href={`/profile?user=${encodeURIComponent(user.username)}`}>
          View public profile
        </Link>
      </div>

      {dbError ? (
        <div className="notice notice-danger">
          <strong>Database error:</strong> {dbError}
        </div>
      ) : null}

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <strong>{stats.total}</strong>
          <span>your notes</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.public}</strong>
          <span>public</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.private}</strong>
          <span>private</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.replies}</strong>
          <span>replies received</span>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <h2 style={{ fontSize: 26 }}>Write a new note</h2>
            <p className="muted small">
              Notes can be public or private. Bodies accept HTML and are rendered
              without sanitization.
            </p>
            <NoteComposer />
          </div>

          <div className="section-heading">
            <h2>Your notes</h2>
            <span className="muted small">{notes.length} total</span>
          </div>

          {notes.length ? (
            <div className="note-list">
              {notes.map((note) => (
                <div key={note.id}>
                  <NoteCard note={note} showVisibility />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                      marginTop: -4,
                    }}
                  >
                    <Link className="btn btn-ghost btn-sm" href={`/notes/${note.id}`}>
                      Open note
                    </Link>
                    <DeleteNoteButton noteId={note.id} redirectTo="/dashboard" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              No notes yet. The composer above is the fastest way to change that.
            </div>
          )}
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>Identity</h3>
            <dl className="meta-list">
              <div>
                <dt>Username</dt>
                <dd>@{user.username}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email || '—'}</dd>
              </div>
              <div>
                <dt>Role (DB)</dt>
                <dd>{user.role}</dd>
              </div>
              <div>
                <dt>OIDC subject</dt>
                <dd>{user.oidc_subject}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatDate(user.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h3>Quick actions</h3>
            <div className="stack">
              <Link className="btn btn-ghost btn-sm" href="/files">
                Upload a file
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/search">
                Explore public notes
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/admin">
                Open admin console
              </Link>
              <a className="btn btn-ghost btn-sm" href="/api/auth/session">
                Inspect session JSON
              </a>
            </div>
          </div>

          <div className="card">
            <h3>Lab reminder</h3>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Private notes are a UI concept in this app, not an enforced access
              control. Follow the ID in a note URL to see.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
