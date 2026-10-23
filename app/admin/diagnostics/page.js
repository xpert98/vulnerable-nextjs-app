import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getSession } from '@/lib/session';
import DiagnosticsForm from '@/components/DiagnosticsForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diagnostics' };

export default async function DiagnosticsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?returnTo=/admin/diagnostics');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?returnTo=/admin/diagnostics');
  }

  return (
    <>
      <p className="small">
        <Link href="/admin">← Admin console</Link>
      </p>

      <div className="page-header">
        <div>
          <span className="eyebrow">Network utilities</span>
          <h1>Diagnostics</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Resolve a hostname from inside the app container. Signed in as{' '}
            <strong>@{user.username}</strong> ({user.role}).
          </p>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Host lookup</h3>
          <p className="muted small">
            The value is passed to <code>nslookup</code> through a shell.
          </p>
          <DiagnosticsForm />
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>API access</h3>
            <p className="muted small">
              The endpoint is reachable without a session, despite living under
              the admin surface.
            </p>
            <pre className="code-block">
{`curl 'http://localhost:3000/api/admin/diagnostics?host=example.com'`}
            </pre>
          </div>

          <div className="card">
            <h3>Related endpoints</h3>
            <div className="stack">
              <a className="btn btn-ghost btn-sm" href="/api/debug">
                Environment dump
              </a>
              <a className="btn btn-ghost btn-sm" href="/api/admin/users">
                Admin users API
              </a>
              <a className="btn btn-ghost btn-sm" href="/api/admin/keys">
                Admin keys API
              </a>
              <Link className="btn btn-ghost btn-sm" href="/admin">
                Admin console
              </Link>
            </div>
          </div>

          <div className="card">
            <h3>Testbed</h3>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Command output is returned verbatim, including errors and the
              exact command that ran.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
