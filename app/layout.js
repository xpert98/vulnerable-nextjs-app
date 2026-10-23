import Link from 'next/link';
import './globals.css';
import { getSession } from '@/lib/session';
import { initial } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: {
    default: 'Beacon — field notes for builders',
    template: '%s · Beacon',
  },
  description:
    'Beacon is an intentionally vulnerable Next.js testbed with Keycloak SSO and a Postgres backend.',
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/">
              <span className="brand-mark">B</span>
              <span className="brand-text">
                <strong>Beacon</strong>
                <small>field notes for builders</small>
              </span>
            </Link>

            <nav className="main-nav" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/search">Explore</Link>
              <Link href="/files">Library</Link>
              <Link href="/members">Members</Link>
              {session ? <Link href="/dashboard">Dashboard</Link> : null}
              {session ? <Link href="/admin">Admin</Link> : null}
            </nav>

            <div className="header-actions">
              {session ? (
                <>
                  <Link className="user-chip" href="/profile" title="View your profile">
                    <span className="avatar">{initial(session.username)}</span>
                    <span>{session.username}</span>
                  </Link>
                  <a className="btn btn-ghost btn-sm" href="/api/auth/logout">
                    Log out
                  </a>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost btn-sm" href="/login">
                    Log in
                  </Link>
                  <a className="btn btn-primary btn-sm" href="/api/auth/login">
                    SSO sign in
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="container page">{children}</main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-brand">
              <span className="brand-mark" aria-hidden="true">
                B
              </span>
              <span>Beacon</span>
            </div>
            <nav className="footer-links" aria-label="Footer navigation">
              <Link href="/search">Explore</Link>
              <Link href="/files">Library</Link>
              <Link href="/members">Members</Link>
              <Link href="/admin">Admin console</Link>
              <a href="/api/debug">Debug</a>
            </nav>
            <span className="danger-pill">Intentionally vulnerable · lab use only</span>
          </div>
          <div className="container footer-base">
            Beacon testbed · Next.js + Keycloak + Postgres · Do not expose this
            stack to the internet.
          </div>
        </footer>
      </body>
    </html>
  );
}
