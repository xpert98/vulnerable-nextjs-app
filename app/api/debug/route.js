import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * INTENTIONALLY VULNERABLE (testbed): dumps process environment, including
 * the database URL, OIDC client secret, and session signing key. This is
 * what makes session forgery and credential discovery possible in the lab.
 */
export async function GET() {
  return NextResponse.json({
    warning:
      'Intentionally exposed environment. Beacon is a vulnerable testbed - do not deploy this anywhere real.',
    node: process.version,
    platform: process.platform,
    pid: process.pid,
    cwd: process.cwd(),
    uptimeSeconds: Math.round(process.uptime()),
    secrets: {
      DATABASE_URL: process.env.DATABASE_URL || null,
      OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || null,
      SESSION_SECRET: process.env.SESSION_SECRET || null,
      OIDC_ISSUER: process.env.OIDC_ISSUER || null,
      OIDC_INTERNAL_ISSUER: process.env.OIDC_INTERNAL_ISSUER || null,
    },
    env: process.env,
  });
}
