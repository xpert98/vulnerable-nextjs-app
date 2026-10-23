import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { getCurrentUser, getSession } from '@/lib/session';
import { formatDate } from '@/lib/format';
import NoteCard from '@/components/NoteCard';
import ProfileForm from '@/components/ProfileForm';
import PreviewForm from '@/components/PreviewForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile' };

export default async function ProfilePage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  const requestedUsername =
    typeof params?.user === 'string' && params.user ? params.user : '';

  if (!requestedUsername && !session) {
    redirect('/login?returnTo=/profile');
  }

  const currentUser = session ? await getCurrentUser() : null;

  let profile = currentUser;
  if (requestedUsername) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE username = $1 LIMIT 1',
        [requestedUsername],
      );
      profile = rows[0] || null;
    } catch {
      profile = null;
    }
  }

  if (!profile) {
    notFound();
  }

  const isOwnProfile = Boolean(currentUser && currentUser.id === profile.id);

  let notes = [];
  try {
    const { rows } = await pool.query(
      `SELECT n.*, u.username, u.display_name
         FROM notes n
         JOIN users u ON u.id = n.user_id
        WHERE n.user_id = $1
          AND ($2::boolean OR n.visibility = 'public')
        ORDER BY n.created_at DESC`,
      [profile.id, isOwnProfile],
    );
    notes = rows;
  } catch {
    notes = [];
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Member profile</span>
          <h1>@{profile.username}</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {profile.display_name} ·{' '}
            <span className={`badge badge-${profile.role === 'admin' ? 'admin' : 'member'}`}>
              {profile.role}
            </span>
          </p>
        </div>
        {isOwnProfile ? (
          <Link className="btn btn-ghost" href="/dashboard">
            Back to dashboard
          </Link>
        ) : null}
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="member-top">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="avatar avatar-xl"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="avatar avatar-xl">
                  {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                </span>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: 28 }}>{profile.display_name}</h2>
                <p className="muted small" style={{ margin: '3px 0 0' }}>
                  @{profile.username} · joined {formatDate(profile.created_at)}
                </p>
                <p className="small" style={{ margin: '8px 0 0' }}>
                  <span className="badge badge-neutral">{profile.email || 'no email'}</span>
                </p>
              </div>
            </div>

            <p className="muted" style={{ marginTop: 18, marginBottom: 0 }}>
              {profile.bio || 'No bio yet.'}
            </p>
          </div>

          <div className="section-heading">
            <h2>{isOwnProfile ? 'Your notes' : 'Public notes'}</h2>
            <span className="muted small">
              {notes.length} note{notes.length === 1 ? '' : 's'}
            </span>
          </div>

          {notes.length ? (
            <div className="note-list">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} showVisibility={isOwnProfile} />
              ))}
            </div>
          ) : (
            <div className="empty">No notes here yet.</div>
          )}
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>Account details</h3>
            <dl className="meta-list">
              <div>
                <dt>Local ID</dt>
                <dd>{profile.id}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{profile.role}</dd>
              </div>
              <div>
                <dt>OIDC subject</dt>
                <dd>{profile.oidc_subject || '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          </div>

          {isOwnProfile ? (
            <>
              <div className="card">
                <h3>Edit profile</h3>
                <ProfileForm user={profile} />
              </div>

              <div className="card">
                <h3>Link preview</h3>
                <p className="muted small">
                  Fetch a URL from the server to build a preview card.
                </p>
                <PreviewForm />
              </div>

              <div className="card">
                <h3>Notification preferences</h3>
                <p className="muted small" style={{ marginBottom: 0 }}>
                  Stored as JSON on your user record. The API merges the request
                  body recursively.
                </p>
                <pre className="code-block" style={{ marginBottom: 0 }}>
{`POST /api/preferences
{"digest":"weekly","theme":"paper"}`}
                </pre>
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Say hello</h3>
              <p className="muted small">
                You are viewing a public profile. Sign in to see your own notes
                and edit your details.
              </p>
              <Link className="btn btn-ghost btn-sm" href="/login">
                Sign in
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
