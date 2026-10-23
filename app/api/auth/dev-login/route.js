import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  sessionPayloadForUser,
} from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * INTENTIONALLY VULNERABLE (testbed): authentication bypass.
 *
 * This "development helper" creates a session for any local username with no
 * password and no OIDC round trip. It exists so manual testers and automated
 * scanners can reach authenticated surfaces without scripting Keycloak.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const returnTo = searchParams.get('returnTo') || '/dashboard';

  if (!username) {
    return NextResponse.json(
      {
        error: 'username is required',
        example: '/api/auth/dev-login?username=admin&returnTo=/dashboard',
      },
      { status: 400 },
    );
  }

  let user;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username],
    );
    user = rows[0];
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json(
      { error: `No local user named ${username}`, users: ['admin', 'alice', 'bob', 'carol', 'dave'] },
      { status: 404 },
    );
  }

  const token = await createSessionToken(sessionPayloadForUser(user));

  // Also intentionally open: returnTo is accepted as an absolute URL.
  let target;
  try {
    target = new URL(returnTo, request.url);
  } catch {
    target = new URL('/dashboard', request.url);
  }

  const response = NextResponse.redirect(target, 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
