import { NextResponse } from 'next/server';
import { oidcConfig, verifyIdToken } from '@/lib/auth';
import { findOrCreateUserFromClaims } from '@/lib/users';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  sessionPayloadForUser,
} from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function loginError(request, message) {
  const target = new URL('/login', request.url);
  target.searchParams.set('error', message);
  return NextResponse.redirect(target, 303);
}

export async function GET(request) {
  const config = oidcConfig();
  const { searchParams } = new URL(request.url);

  const keycloakError = searchParams.get('error');
  if (keycloakError) {
    return loginError(
      request,
      `${keycloakError}: ${searchParams.get('error_description') || 'Keycloak rejected the request'}`,
    );
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get('oidc_state')?.value;
  const nonce = request.cookies.get('oidc_nonce')?.value;
  const verifier = request.cookies.get('oidc_verifier')?.value;
  const returnTo = request.cookies.get('oidc_return_to')?.value || '/dashboard';

  if (!code) {
    return loginError(request, 'Missing authorization code');
  }

  if (!state || !cookieState || state !== cookieState) {
    return loginError(request, 'OIDC state mismatch');
  }

  if (!verifier) {
    return loginError(request, 'Missing PKCE verifier');
  }

  let tokens;
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: verifier,
    });

    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      return loginError(
        request,
        `Token exchange failed (${tokenResponse.status}): ${text.slice(0, 300)}`,
      );
    }

    tokens = await tokenResponse.json();
  } catch (error) {
    return loginError(request, `Token exchange error: ${error.message}`);
  }

  if (!tokens.id_token) {
    return loginError(request, 'Keycloak did not return an ID token');
  }

  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, nonce);
  } catch (error) {
    return loginError(request, `ID token validation failed: ${error.message}`);
  }

  let user;
  try {
    user = await findOrCreateUserFromClaims(claims);
  } catch (error) {
    return loginError(request, `User provisioning failed: ${error.message}`);
  }

  const sessionToken = await createSessionToken(sessionPayloadForUser(user));

  // INTENTIONALLY VULNERABLE (testbed): returnTo may be an absolute URL,
  // producing an open redirect after a successful login.
  let target;
  try {
    target = new URL(returnTo, request.url);
  } catch {
    target = new URL('/dashboard', request.url);
  }

  const response = NextResponse.redirect(target, 303);
  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());

  for (const name of [
    'oidc_state',
    'oidc_nonce',
    'oidc_verifier',
    'oidc_return_to',
  ]) {
    response.cookies.set(name, '', { ...sessionCookieOptions(0), maxAge: 0 });
  }

  return response;
}
