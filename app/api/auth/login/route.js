import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { oidcConfig } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
  maxAge: 10 * 60,
};

export async function GET(request) {
  const config = oidcConfig();
  const { searchParams } = new URL(request.url);

  // INTENTIONALLY VULNERABLE (testbed): returnTo is not validated before it
  // is stored and later used as a redirect target.
  const returnTo = searchParams.get('returnTo') || '/dashboard';

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  const authorizeUrl = new URL(config.authorizeEndpoint);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('nonce', nonce);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authorizeUrl.toString(), 307);
  response.cookies.set('oidc_state', state, cookieOptions);
  response.cookies.set('oidc_nonce', nonce, cookieOptions);
  response.cookies.set('oidc_verifier', verifier, cookieOptions);
  response.cookies.set('oidc_return_to', returnTo, cookieOptions);

  return response;
}
