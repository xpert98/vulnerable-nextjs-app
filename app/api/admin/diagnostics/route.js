import { exec } from 'node:child_process';
import { NextResponse } from 'next/server';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function runDiagnostic(host) {
  return new Promise((resolve) => {
    // INTENTIONALLY VULNERABLE (testbed): shell command injection. The host
    // value is concatenated into a command passed to /bin/sh.
    const command = `nslookup ${host}`;

    exec(
      command,
      { timeout: 8_000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          command,
          exitCode: error?.code ?? 0,
          error: error ? error.message : null,
          stdout,
          stderr,
        });
      },
    );
  });
}

async function handle(host) {
  const value = String(host || 'example.com');
  const result = await runDiagnostic(value);
  return NextResponse.json(result);
}

/**
 * INTENTIONALLY VULNERABLE (testbed): unauthenticated command injection.
 * Both GET and POST are accepted so it is easy to drive from curl or a
 * browser-based test.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  return handle(searchParams.get('host'));
}

export async function POST(request) {
  const body = await readBody(request);
  return handle(body.host);
}
