import Link from 'next/link';
import { pool } from '@/lib/db';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Members' };

export default async function MembersPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === 'string' ? params.q : '';

  let members = [];
  let error = '';
  let executedQuery = '';

  try {
    // INTENTIONALLY VULNERABLE (testbed): user-controlled LIKE input is
    // interpolated into the query. Do not parameterize.
    executedQuery = `SELECT u.id, u.username, u.display_name, u.role, u.bio,
              u.avatar_url, u.created_at,
              COUNT(n.id)::int AS note_count,
              COUNT(n.id) FILTER (WHERE n.visibility = 'public')::int AS public_count
         FROM users u
         LEFT JOIN notes n ON n.user_id = u.id
        WHERE u.username ILIKE '%${q}%'
           OR COALESCE(u.display_name, '') ILIKE '%${q}%'
        GROUP BY u.id
        ORDER BY u.id ASC`;

    const { rows } = await pool.query(executedQuery);
    members = rows;
  } catch (err) {
    error = err.message;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Member directory</span>
          <h1>People of Beacon</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {members.length} member{members.length === 1 ? '' : 's'} · profiles,
            notes, and the occasional strong opinion about terminals.
          </p>
        </div>
        <form className="search-form" action="/members" method="GET" style={{ minWidth: 300 }}>
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Filter by name"
          />
          <button className="btn btn-secondary" type="submit">
            Filter
          </button>
        </form>
      </div>

      {q ? (
        <div className="card card-tight" style={{ marginBottom: 18 }}>
          <span className="muted small">Showing members matching </span>
          <span className="raw-query" dangerouslySetInnerHTML={{ __html: q }} />
        </div>
      ) : null}

      {error ? (
        <div className="notice notice-danger">
          <strong>Directory query failed:</strong>
          <pre className="code-block">{error}</pre>
          {executedQuery ? (
            <details>
              <summary className="small">Show executed SQL</summary>
              <pre className="code-block">{executedQuery}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {members.length ? (
        <div className="member-grid">
          {members.map((member) => (
            <article className="card member-card" key={member.id}>
              <div className="member-top">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt=""
                    className="avatar"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <span className="avatar">
                    {(member.display_name || member.username || '?')[0].toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>
                    <Link href={`/profile?user=${encodeURIComponent(member.username)}`}>
                      @{member.username}
                    </Link>
                  </strong>
                  <div className="muted tiny">
                    <span
                      className={`badge badge-${member.role === 'admin' ? 'admin' : 'member'}`}
                    >
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>

              <p className="muted small">{member.bio || 'No bio yet.'}</p>

              <div className="note-card-foot" style={{ marginTop: 'auto' }}>
                <span>{member.public_count} public</span>
                <span>{member.note_count} total</span>
              </div>

              <div className="muted tiny">Joined {formatDate(member.created_at)}</div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="empty">No members matched that filter.</div>
      ) : null}
    </>
  );
}
