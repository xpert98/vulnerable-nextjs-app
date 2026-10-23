import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { getCurrentUser, getSession } from '@/lib/session';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?returnTo=/admin');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?returnTo=/admin');
  }

  let users = [];
  let keys = [];
  let recentNotes = [];
  let stats = { users: 0, notes: 0, privateNotes: 0, keys: 0 };
  let error = '';

  try {
    const [userRows, keyRows, noteRows] = await Promise.all([
      pool.query(
        `SELECT id, oidc_subject, username, email, display_name, role, bio, created_at
           FROM users
          ORDER BY id ASC`,
      ),
      pool.query(
        `SELECT k.id, k.name, k.token, k.created_at, u.username
           FROM api_keys k
           LEFT JOIN users u ON u.id = k.owner_id
          ORDER BY k.id ASC`,
      ),
      pool.query(
        `SELECT n.id, n.title, n.visibility, n.created_at, u.username
           FROM notes n
           JOIN users u ON u.id = n.user_id
          ORDER BY n.created_at DESC
          LIMIT 10`,
      ),
    ]);

    users = userRows.rows;
    keys = keyRows.rows;
    recentNotes = noteRows.rows;
    stats = {
      users: users.length,
      notes: recentNotes.length,
      privateNotes: recentNotes.filter((note) => note.visibility === 'private').length,
      keys: keys.length,
    };
  } catch (err) {
    error = err.message;
  }

  const isAdmin = user.role === 'admin';

  return (
    <>
      <div className="admin-banner">
        <div>
          <span className="eyebrow">Restricted area</span>
          <h1>Admin console</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Signed in as <strong>@{user.username}</strong> · database role:{' '}
            <span className={`badge badge-${isAdmin ? 'admin' : 'member'}`}>
              {user.role}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary btn-sm" href="/admin/diagnostics">
            Diagnostics
          </Link>
          <a className="btn btn-ghost btn-sm" href="/api/debug">
            Debug endpoint
          </a>
        </div>
      </div>

      {!isAdmin ? (
        <div className="notice notice-danger">
          <strong>Broken access control:</strong> this page only checks that you
          are signed in. Your role is <code>{user.role}</code>, but the admin data
          below is still rendered.
        </div>
      ) : null}

      {error ? (
        <div className="notice notice-danger">
          <strong>Admin query failed:</strong> {error}
        </div>
      ) : null}

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <strong>{users.length}</strong>
          <span>users</span>
        </div>
        <div className="admin-stat">
          <strong>{recentNotes.length}</strong>
          <span>recent notes</span>
        </div>
        <div className="admin-stat">
          <strong>{stats.privateNotes}</strong>
          <span>private in list</span>
        </div>
        <div className="admin-stat">
          <strong>{keys.length}</strong>
          <span>API keys</span>
        </div>
      </div>

      <div className="section-heading" style={{ marginTop: 0 }}>
        <h2>Users</h2>
        <span className="muted small">OIDC identities mapped to local rows</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Display name</th>
              <th>Email</th>
              <th>Role</th>
              <th>OIDC subject</th>
            </tr>
          </thead>
          <tbody>
            {users.map((member) => (
              <tr key={member.id}>
                <td>{member.id}</td>
                <td>
                  <Link href={`/profile?user=${encodeURIComponent(member.username)}`}>
                    @{member.username}
                  </Link>
                </td>
                <td>{member.display_name}</td>
                <td>{member.email}</td>
                <td>
                  <span className={`badge badge-${member.role === 'admin' ? 'admin' : 'member'}`}>
                    {member.role}
                  </span>
                </td>
                <td><code>{member.oidc_subject}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-heading">
        <h2>API keys</h2>
        <span className="muted small">Plaintext by design</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Owner</th>
              <th>Token</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id}>
                <td>{key.id}</td>
                <td>{key.name}</td>
                <td>{key.username ? `@${key.username}` : '—'}</td>
                <td><code>{key.token}</code></td>
                <td>{formatDateTime(key.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-heading">
        <h2>Recent notes</h2>
        <span className="muted small">Includes private records</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Author</th>
              <th>Visibility</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recentNotes.map((note) => (
              <tr key={note.id}>
                <td>{note.id}</td>
                <td><Link href={`/notes/${note.id}`}>{note.title}</Link></td>
                <td>@{note.username}</td>
                <td>
                  <span
                    className={`badge ${
                      note.visibility === 'private' ? 'badge-private' : 'badge-public'
                    }`}
                  >
                    {note.visibility}
                  </span>
                </td>
                <td>{formatDateTime(note.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-heading">
        <h2>Admin APIs</h2>
      </div>
      <div className="grid grid-3">
        <div className="card">
          <h3>Users</h3>
          <p className="muted small">Returns every local user and OIDC subject.</p>
          <a className="btn btn-ghost btn-sm" href="/api/admin/users">
            GET /api/admin/users
          </a>
        </div>
        <div className="card">
          <h3>Keys</h3>
          <p className="muted small">Returns plaintext API credentials.</p>
          <a className="btn btn-ghost btn-sm" href="/api/admin/keys">
            GET /api/admin/keys
          </a>
        </div>
        <div className="card">
          <h3>Environment</h3>
          <p className="muted small">Dumps process environment variables.</p>
          <a className="btn btn-ghost btn-sm" href="/api/debug">
            GET /api/debug
          </a>
        </div>
      </div>
    </>
  );
}
