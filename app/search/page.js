import Link from 'next/link';
import { pool } from '@/lib/db';
import NoteCard from '@/components/NoteCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explore' };

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === 'string' ? params.q : '';

  let results = [];
  let error = '';
  let executedQuery = '';

  try {
    // INTENTIONALLY VULNERABLE (testbed): q is interpolated directly into
    // the SQL string. Do not parameterize this line.
    executedQuery = `SELECT n.id, n.title, n.body, n.visibility, n.attachment,
              n.created_at, u.username, u.display_name
         FROM notes n
         JOIN users u ON u.id = n.user_id
        WHERE n.visibility = 'public'
          AND (n.title ILIKE '%${q}%' OR n.body ILIKE '%${q}%')
        ORDER BY n.created_at DESC
        LIMIT 30`;

    const { rows } = await pool.query(executedQuery);
    results = rows;
  } catch (err) {
    error = err.message;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Search the community</span>
          <h1>Explore Beacon</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {results.length} result{results.length === 1 ? '' : 's'}
            {q ? ' for your query' : ' across public notes'}.
          </p>
        </div>
        <form className="search-form" action="/search" method="GET" style={{ minWidth: 320 }}>
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Try “postgres”, “homelab”, or “checklist”"
          />
          <button className="btn btn-secondary" type="submit">
            Search
          </button>
        </form>
      </div>

      {q ? (
        <div className="card card-tight" style={{ marginBottom: 18 }}>
          <span className="muted small">Results for </span>
          {/* INTENTIONALLY VULNERABLE (testbed): reflected XSS sink. */}
          <span className="raw-query" dangerouslySetInnerHTML={{ __html: q }} />
        </div>
      ) : null}

      {error ? (
        <div className="notice notice-danger">
          <strong>Search error:</strong>
          <pre className="code-block">{error}</pre>
          {executedQuery ? (
            <details>
              <summary className="small">Show executed SQL</summary>
              <pre className="code-block">{executedQuery}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="two-col">
        <section>
          {results.length ? (
            <div className="note-list">
              {results.map((note) => (
                <NoteCard key={`${note.id}-${note.title}`} note={note} />
              ))}
            </div>
          ) : !error ? (
            <div className="empty">
              No matches. Try a broader term, or{' '}
              <Link href="/dashboard">write a note</Link> about what you were
              looking for.
            </div>
          ) : null}
        </section>

        <aside className="sidebar">
          <div className="card">
            <h3>Search tips</h3>
            <p className="muted small">
              Search looks at note titles and bodies. Public notes only — unless
              the query has other ideas.
            </p>
            <p className="muted tiny" style={{ marginBottom: 0 }}>
              The API version lives at <code>/api/search?q=</code>.
            </p>
          </div>
          <div className="card">
            <h3>Browse instead</h3>
            <div className="stack">
              <Link className="btn btn-ghost btn-sm" href="/">
                Latest notes
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/members">
                Member directory
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/files">
                Shared library
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
