import Link from 'next/link';
import { excerpt, formatDate } from '@/lib/format';

export default function NoteCard({ note, showVisibility = false }) {
  const visibility = note.visibility === 'private' ? 'private' : 'public';
  const author = note.display_name || note.username || 'unknown';

  return (
    <article className="note-card">
      <div className="note-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showVisibility ? (
            <span className={`badge badge-${visibility}`}>{visibility}</span>
          ) : null}
          {note.attachment ? (
            <span className="badge badge-neutral">attachment</span>
          ) : null}
        </div>
        <span className="muted small">{formatDate(note.created_at)}</span>
      </div>

      <h3>
        <Link href={`/notes/${note.id}`}>{note.title}</Link>
      </h3>

      <p className="note-excerpt">{excerpt(note.body, 190)}</p>

      <div className="note-card-foot">
        <span>
          @{note.username} · {author}
        </span>
        <span className="muted small">note #{note.id}</span>
      </div>
    </article>
  );
}
