import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  // INTENTIONALLY VULNERABLE (testbed): the public API mirrors the search
  // page and interpolates the user's query into SQL.
  const sql = `SELECT n.id, n.title, n.body, n.visibility, n.attachment,
                      n.user_id, n.created_at, u.username
                 FROM notes n
                 JOIN users u ON u.id = n.user_id
                WHERE n.visibility = 'public'
                  AND (n.title ILIKE '%${q}%' OR n.body ILIKE '%${q}%')
                ORDER BY n.created_at DESC
                LIMIT 50`;

  try {
    const { rows } = await pool.query(sql);
    return NextResponse.json({ query: sql, count: rows.length, notes: rows });
  } catch (error) {
    return NextResponse.json(
      { query: sql, error: error.message, notes: [] },
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
  const title = String(body.title || '').trim();
  const noteBody = String(body.body || '');
  const visibility = String(body.visibility || 'public');
  const attachment = body.attachment ? String(body.attachment) : null;

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (user_id, title, body, visibility, attachment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session.uid, title, noteBody, visibility, attachment],
    );

    return NextResponse.json({ note: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
