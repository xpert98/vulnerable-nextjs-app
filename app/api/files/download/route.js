import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const mimeTypes = {
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'welcome.txt';
  const forcedType = searchParams.get('type');

  // INTENTIONALLY VULNERABLE (testbed): path traversal / arbitrary file read.
  // An absolute name (`/etc/passwd`) or a `../` sequence resolves outside the
  // upload directory. There is also no authorization check.
  const target = path.resolve(uploadRoot(), name);

  let data;
  try {
    data = await readFile(/* turbopackIgnore: true */ target);
  } catch (error) {
    return NextResponse.json(
      { error: error.message, name, path: target },
      { status: 404 },
    );
  }

  const extension = path.extname(target).toLowerCase();
  const contentType =
    forcedType || mimeTypes[extension] || 'application/octet-stream';

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${path.basename(target)}"`,
      'Content-Length': String(data.length),
      'X-Served-Path': target,
      'Cache-Control': 'no-store',
    },
  });
}
