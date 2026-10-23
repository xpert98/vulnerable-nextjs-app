import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('noteId');

  // INTENTIONALLY VULNERABLE (testbed): noteId is interpolated when supplied.
  const sql = noteId
    ? `SELECT c.id, c.note_id, c.user_id, c.body, c.created_at, u.username
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.note_id = ${noteId}
        ORDER BY c.created_at ASC`
    : `SELECT c.id, c.note_id, c.user_id, c.body, c.created_at, u.username
         FROM comments c
         JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC
        LIMIT 50`;

  try {
    const { rows } = await pool.query(sql);
    return NextResponse.json({ query: sql, count: rows.length, comments: rows });
  } catch (error) {
    return NextResponse.json(
      { query: sql, error: error.message, comments: [] },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const body = await readBody(request);
  const noteId = body.noteId ?? body.note_id;
  const commentBody = String(body.body || body.comment || '');

  if (!noteId || !commentBody.trim()) {
    return NextResponse.json(
      { error: 'noteId and body are required' },
      { status: 400 },
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO comments (note_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [noteId, session.uid, commentBody],
    );

    return NextResponse.json(
      { comment: { ...rows[0], username: session.username } },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
