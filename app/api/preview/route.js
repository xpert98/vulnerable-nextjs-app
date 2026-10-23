import { NextResponse } from 'next/server';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * INTENTIONALLY VULNERABLE (testbed): server-side request forgery.
 *
 * The server fetches any URL the caller supplies - internal services,
 * Keycloak's admin surface, or a cloud metadata endpoint. There is no
 * allowlist, scheme validation, or authentication.
 */
async function preview(requestedUrl) {
  let target = requestedUrl;

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
    target = `http://${target}`;
  }

  const response = await fetch(target, {
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
    headers: {
      'user-agent': 'Beacon-Link-Preview/1.0',
      accept: '*/*',
    },
  });

  const body = await response.text();

  return {
    requested: requestedUrl,
    finalUrl: response.url,
    status: response.status,
    contentType: response.headers.get('content-type'),
    headers: Object.fromEntries(response.headers.entries()),
    body: body.slice(0, 30_000),
    truncated: body.length > 30_000,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      {
        error: 'url query parameter is required',
        example: '/api/preview?url=http://keycloak:8080/realms/beacon',
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await preview(url));
  } catch (error) {
    return NextResponse.json(
      { requested: url, error: error.message },
      { status: 502 },
    );
  }
}

export async function POST(request) {
  const body = await readBody(request);
  const url = body.url ? String(body.url) : '';

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    return NextResponse.json(await preview(url));
  } catch (error) {
    return NextResponse.json(
      { requested: url, error: error.message },
      { status: 502 },
    );
  }
}
