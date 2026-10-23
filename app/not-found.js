import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 620, margin: '40px auto', textAlign: 'center' }}>
      <span className="eyebrow" style={{ justifyContent: 'center' }}>
        404
      </span>
      <h1>Not found</h1>
      <p className="muted">
        That note, profile, or file does not exist. Or the URL was more creative
        than the database.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/">
          Back home
        </Link>
        <Link className="btn btn-ghost" href="/search">
          Explore notes
        </Link>
      </div>
    </div>
  );
}
