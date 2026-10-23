import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return NextResponse.json(
      { error: `could not parse multipart body: ${error.message}` },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const fileName = String(form.get('name') || file.name || 'upload.bin');

  // INTENTIONALLY VULNERABLE (testbed): no extension/MIME/size validation,
  // and the caller-supplied name is resolved as a filesystem path. Absolute
  // names and `../` sequences escape the upload directory.
  const target = path.resolve(uploadRoot(), fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    await mkdir(/* turbopackIgnore: true */ path.dirname(target), {
      recursive: true,
    });
    await writeFile(/* turbopackIgnore: true */ target, bytes);
  } catch (error) {
    return NextResponse.json(
      { error: error.message, path: target },
      { status: 500 },
    );
  }

  const session = await getSession();
  let recorded = null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO attachments (user_id, original_name, stored_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        session?.uid || null,
        file.name || fileName,
        fileName,
        file.type || 'application/octet-stream',
        bytes.length,
      ],
    );
    recorded = rows[0];
  } catch (error) {
    return NextResponse.json(
      {
        ok: true,
        warning: 'file written but metadata insert failed',
        error: error.message,
        name: fileName,
        path: target,
        size: bytes.length,
      },
      { status: 207 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      name: fileName,
      path: target,
      size: bytes.length,
      attachment: recorded,
      url: `/api/files/download?name=${encodeURIComponent(fileName)}`,
    },
    { status: 201 },
  );
}
