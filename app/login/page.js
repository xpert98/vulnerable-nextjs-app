import Link from 'next/link';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

const demoAccounts = [
  { username: 'admin', label: 'Avery Admin', role: 'admin', password: 'admin123' },
  { username: 'alice', label: 'Alice Nguyen', role: 'member', password: 'password123' },
  { username: 'bob', label: 'Bob Martinez', role: 'member', password: 'password123' },
  { username: 'carol', label: 'Carol Okafor', role: 'member', password: 'password123' },
  { username: 'dave', label: 'Dave Kim', role: 'member', password: 'password123' },
];

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  const returnTo =
    typeof params?.returnTo === 'string' && params.returnTo
      ? params.returnTo
      : '/dashboard';
  const error = typeof params?.error === 'string' ? params.error : '';
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="auth-grid">
      <section className="card auth-card">
        <span className="eyebrow">Keycloak SSO</span>
        <h1>Sign in to Beacon</h1>
        <p className="muted">
          Authentication is handled by the <code>beacon</code> Keycloak realm.
          The app never sees your password; it receives an OIDC ID token and
          maps the subject to a local member record.
        </p>

        {error ? (
          <div className="notice notice-danger">
            <strong>Sign-in failed:</strong> {error}
          </div>
        ) : null}

        {session ? (
          <div className="notice notice-success">
            You are already signed in as <strong>{session.username}</strong>.
            <div style={{ marginTop: 12 }}>
              <Link className="btn btn-primary" href="/dashboard">
                Continue to dashboard
              </Link>
              <a className="btn btn-ghost" href="/api/auth/logout" style={{ marginLeft: 8 }}>
                Log out
              </a>
            </div>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 20 }}>
            <a className="btn btn-primary" href={loginHref}>
              Continue with Keycloak
            </a>
            <p className="muted small" style={{ margin: 0 }}>
              OIDC authorization code flow with PKCE. The public issuer is{' '}
              <code>http://localhost:8081/realms/beacon</code>.
            </p>
          </div>
        )}

        <div className="notice notice-warn" style={{ marginTop: 22 }}>
          <strong>Testbed note:</strong> the OIDC flow is real, but this app also
          ships an intentional authentication bypass for lab automation.
        </div>
      </section>

      <aside className="card auth-card">
        <h2 style={{ fontSize: 26 }}>Demo access</h2>
        <p className="muted small">
          Use Keycloak with the passwords below, or jump straight into a local
          session through the intentionally vulnerable dev-login endpoint.
        </p>

        <div className="demo-list">
          {demoAccounts.map((account) => (
            <div className="demo-account" key={account.username}>
              <div>
                <strong>{account.label}</strong>
                <div className="muted tiny">
                  <code>{account.username}</code> / <code>{account.password}</code>{' '}
                  · {account.role}
                </div>
              </div>
              <a
                className="btn btn-ghost btn-sm"
                href={`/api/auth/dev-login?username=${encodeURIComponent(
                  account.username,
                )}&returnTo=${encodeURIComponent(returnTo)}`}
              >
                Enter
              </a>
            </div>
          ))}
        </div>

        <p className="muted tiny" style={{ marginTop: 16, marginBottom: 0 }}>
          Keycloak admin console:{' '}
          <a href="http://localhost:8081/admin" target="_blank" rel="noreferrer">
            localhost:8081/admin
          </a>{' '}
          (<code>admin</code> / <code>admin</code>)
        </p>
      </aside>
    </div>
  );
}
