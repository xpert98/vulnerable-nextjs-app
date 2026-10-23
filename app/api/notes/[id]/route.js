import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id } = await params;

  // INTENTIONALLY VULNERABLE (testbed): path parameter interpolated into
  // SQL. Also note the missing visibility/owner predicate: private notes are
  // readable by anyone who knows or guesses an ID.
  const sql = `SELECT n.*, u.username, u.display_name, u.role
                 FROM notes n
                 JOIN users u ON u.id = n.user_id
                WHERE n.id = ${id}
                LIMIT 1`;

  try {
    const { rows } = await pool.query(sql);
    if (!rows[0]) {
      return NextResponse.json({ query: sql, error: 'note not found' }, { status: 404 });
    }
    return NextResponse.json({ query: sql, note: rows[0] });
  } catch (error) {
    return NextResponse.json({ query: sql, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await readBody(request);

  // INTENTIONALLY VULNERABLE (testbed): any signed-in user can edit any note,
  // including its owner (`user_id`) and visibility. This is both a broken
  // object-level authorization bug and mass assignment.
  const allowed = ['title', 'body', 'visibility', 'attachment', 'user_id'];
  const fields = allowed.filter((field) => Object.hasOwn(body, field));

  if (!fields.length) {
    return NextResponse.json({ error: 'no editable fields supplied' }, { status: 400 });
  }

  const values = fields.map((field) => body[field]);
  const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
  values.push(id);

  const sql = `UPDATE notes
                  SET ${assignments.join(', ')}
                WHERE id = $${values.length}
                RETURNING *`;

  try {
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) {
      return NextResponse.json({ error: 'note not found' }, { status: 404 });
    }
    return NextResponse.json({ note: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const { id } = await params;

  // INTENTIONALLY VULNERABLE (testbed): no ownership check and the ID is
  // interpolated into SQL. A payload like `1 OR 1=1` deletes every note.
  const sql = `DELETE FROM notes WHERE id = ${id}`;

  try {
    const result = await pool.query(sql);
    return NextResponse.json({
      deleted: result.rowCount,
      query: sql,
      deletedBy: session.username,
    });
  } catch (error) {
    return NextResponse.json({ query: sql, error: error.message }, { status: 500 });
  }
}
