import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * OIDC settings for the Beacon lab.
 *
 * The browser talks to Keycloak on the public issuer (localhost:8081).
 * Server-to-server calls use the internal issuer (keycloak:8080) so the
 * app container does not have to route back out through the host. ID tokens
 * are still issued with the public `iss` value, which is what we verify.
 */
export function oidcConfig() {
  const issuer = process.env.OIDC_ISSUER || 'http://localhost:8081/realms/beacon';
  const internalIssuer =
    process.env.OIDC_INTERNAL_ISSUER || process.env.OIDC_ISSUER || issuer;

  return {
    issuer,
    internalIssuer,
    clientId: process.env.OIDC_CLIENT_ID || 'beacon-app',
    clientSecret: process.env.OIDC_CLIENT_SECRET || 'beacon-app-secret',
    redirectUri:
      process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    authorizeEndpoint: `${issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${internalIssuer}/protocol/openid-connect/token`,
    jwksEndpoint: `${internalIssuer}/protocol/openid-connect/certs`,
    logoutEndpoint: `${issuer}/protocol/openid-connect/logout`,
  };
}

let cachedJwks = null;
let cachedJwksUri = null;

function getJwks(uri) {
  if (!cachedJwks || cachedJwksUri !== uri) {
    cachedJwks = createRemoteJWKSet(new URL(uri));
    cachedJwksUri = uri;
  }
  return cachedJwks;
}

export async function verifyIdToken(idToken, expectedNonce) {
  const config = oidcConfig();

  const { payload } = await jwtVerify(idToken, getJwks(config.jwksEndpoint), {
    issuer: config.issuer,
    audience: config.clientId,
    clockTolerance: 60,
  });

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('OIDC nonce mismatch');
  }

  return payload;
}

export function rolesFromClaims(claims) {
  const realmRoles = Array.isArray(claims?.realm_access?.roles)
    ? claims.realm_access.roles
    : [];
  const clientRoles = Array.isArray(
    claims?.resource_access?.[oidcConfig().clientId]?.roles,
  )
    ? claims.resource_access[oidcConfig().clientId].roles
    : [];

  return [...new Set([...realmRoles, ...clientRoles])];
}

export function displayNameFromClaims(claims) {
  const fullName = [claims?.given_name, claims?.family_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    claims?.name ||
    claims?.preferred_username ||
    claims?.email?.split('@')[0] ||
    'Beacon member'
  );
}
