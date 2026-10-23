import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function logout(request) {
  const { searchParams } = new URL(request.url);

  // INTENTIONALLY VULNERABLE (testbed): open redirect on logout.
  const returnTo = searchParams.get('returnTo') || '/';
  const target = new URL(returnTo, request.url);

  const response = NextResponse.redirect(target, 303);
  response.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}

export async function GET(request) {
  return logout(request);
}

export async function POST(request) {
  return logout(request);
}
