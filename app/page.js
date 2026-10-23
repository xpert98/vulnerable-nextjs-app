import Link from 'next/link';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import NoteCard from '@/components/NoteCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home' };

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  const welcome = typeof params?.welcome === 'string' ? params.welcome : '';

  let stats = { members: 0, notes: 0, publicNotes: 0, comments: 0 };
  let recent = [];
  let dbError = '';

  try {
    const [members, notes, publicNotes, comments, recentNotes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM notes'),
      pool.query("SELECT COUNT(*)::int AS count FROM notes WHERE visibility = 'public'"),
      pool.query('SELECT COUNT(*)::int AS count FROM comments'),
      pool.query(
        `SELECT n.id, n.title, n.body, n.visibility, n.attachment, n.created_at,
                u.username, u.display_name
           FROM notes n
           JOIN users u ON u.id = n.user_id
          WHERE n.visibility = 'public'
          ORDER BY n.created_at DESC
          LIMIT 6`,
      ),
    ]);

    stats = {
      members: members.rows[0].count,
      notes: notes.rows[0].count,
      publicNotes: publicNotes.rows[0].count,
      comments: comments.rows[0].count,
    };
    recent = recentNotes.rows;
  } catch (error) {
    dbError = error.message;
  }

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Beacon · field notes</span>
          <h1>Notes from the people who build the thing.</h1>
          <p>
            A small community for the unglamorous parts of engineering: the
            checklist that saved a Friday, the query that finally made sense,
            and the postmortem you wish you had written sooner.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/search">
              Explore the notes
            </Link>
            {session ? (
              <Link className="btn btn-ghost" href="/dashboard">
                Open your dashboard
              </Link>
            ) : (
              <Link className="btn btn-ghost" href="/login">
                Sign in with Keycloak
              </Link>
            )}
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-title">Community pulse</div>
          <div className="stat-grid">
            <div className="stat">
              <strong>{stats.members}</strong>
              <span>members</span>
            </div>
            <div className="stat">
              <strong>{stats.publicNotes}</strong>
              <span>public notes</span>
            </div>
            <div className="stat">
              <strong>{stats.notes}</strong>
              <span>total notes</span>
            </div>
            <div className="stat">
              <strong>{stats.comments}</strong>
              <span>replies</span>
            </div>
          </div>
        </div>
      </section>

      {welcome ? (
        <div
          className="notice"
          style={{ marginTop: 20 }}
          dangerouslySetInnerHTML={{ __html: welcome }}
        />
      ) : null}

      {dbError ? (
        <div className="notice notice-danger" style={{ marginTop: 20 }}>
          <strong>Database error:</strong>
          <pre className="code-block">{dbError}</pre>
        </div>
      ) : null}

      <div className="section-heading">
        <h2>Fresh field notes</h2>
        <Link className="small" href="/search">
          Browse everything →
        </Link>
      </div>

      <div className="two-col">
        <section>
          {recent.length ? (
            <div className="note-list">
              {recent.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <div className="empty">
              No notes yet. Sign in and write the first one.
            </div>
          )}
        </section>

        <aside className="sidebar">
          <div className="card">
            <h3>How this lab is wired</h3>
            <p className="muted small">
              The app is Next.js, the data lives in Postgres, and identities
              come from Keycloak using OIDC. The stack is deliberately
              vulnerable, so the plumbing is more honest than usual.
            </p>
            <ul className="muted small" style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>Keycloak realm: <code>beacon</code></li>
              <li>OIDC client: <code>beacon-app</code></li>
              <li>App port: <code>3000</code></li>
            </ul>
          </div>

          <div className="card">
            <h3>Testbed shortcuts</h3>
            <p className="muted small">
              Demo accounts and direct endpoints are available for automated
              and manual testers.
            </p>
            <div className="stack">
              <Link className="btn btn-ghost btn-sm" href="/login">
                Sign-in options
              </Link>
              <a className="btn btn-ghost btn-sm" href="/api/debug">
                Debug endpoint
              </a>
              <Link className="btn btn-ghost btn-sm" href="/admin">
                Admin console
              </Link>
            </div>
          </div>

          <div className="card">
            <h3>House rules</h3>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Be kind. Give credit. Do not paste real production secrets into a
              note — this lab has enough of its own.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
