import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { pool } from '@/lib/db';

export const SESSION_COOKIE = 'beacon_session';

function sessionSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || 'beacon-session-secret-do-not-use',
  );
}

export function sessionCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    // INTENTIONALLY WEAK (testbed): the lab is served over plain HTTP and
    // has no CSRF token story. SameSite=Lax is the only guard here.
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge,
  };
}

export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('beacon')
    .setAudience('beacon-web')
    .setExpirationTime('12h')
    .sign(sessionSecret());
}

export async function verifySessionToken(token) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: 'beacon',
      audience: 'beacon-web',
    });
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.uid) return null;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [
      session.uid,
    ]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export function sessionPayloadForUser(user) {
  return {
    uid: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    role: user.role,
    sub: user.oidc_subject,
  };
}
