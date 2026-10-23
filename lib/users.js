import { pool } from '@/lib/db';
import { displayNameFromClaims, rolesFromClaims } from '@/lib/auth';

function safeUsername(claims, subject) {
  const source =
    claims?.preferred_username ||
    claims?.email?.split('@')[0] ||
    claims?.name ||
    `user_${String(subject).slice(0, 8)}`;

  return String(source)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 48) || `user_${String(subject).slice(0, 8)}`;
}

/**
 * Map an OIDC identity to the local users table.
 *
 * Existing seeded identities are matched by `sub`, so the Keycloak user IDs
 * in keycloak/realm.json line up with db/init.sql. Unknown users are
 * provisioned automatically to keep the lab usable with a fresh realm.
 */
export async function findOrCreateUserFromClaims(claims) {
  const subject = claims?.sub;
  if (!subject) {
    throw new Error('ID token is missing the sub claim');
  }

  const existing = await pool.query(
    'SELECT * FROM users WHERE oidc_subject = $1 LIMIT 1',
    [subject],
  );

  if (existing.rows[0]) {
    const user = existing.rows[0];
    const displayName = displayNameFromClaims(claims);

    await pool.query(
      'UPDATE users SET email = COALESCE($1, email), display_name = COALESCE($2, display_name) WHERE id = $3',
      [claims.email || null, displayName, user.id],
    );

    return { ...user, email: claims.email || user.email, display_name: displayName };
  }

  const username = safeUsername(claims, subject);
  const displayName = displayNameFromClaims(claims);
  const roles = rolesFromClaims(claims);
  const role = roles.includes('admin') ? 'admin' : 'member';

  let candidate = username;
  const clash = await pool.query('SELECT id FROM users WHERE username = $1', [
    candidate,
  ]);
  if (clash.rows[0]) {
    candidate = `${username}_${String(subject).slice(0, 6)}`;
  }

  const inserted = await pool.query(
    `INSERT INTO users (oidc_subject, username, email, display_name, role, bio, preferences)
     VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
     RETURNING *`,
    [
      subject,
      candidate,
      claims.email || null,
      displayName,
      role,
      'Provisioned automatically from Keycloak SSO.',
    ],
  );

  return inserted.rows[0];
}
