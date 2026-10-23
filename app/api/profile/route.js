import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const id = searchParams.get('id');

  try {
    if (username) {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE username = $1 LIMIT 1',
        [username],
      );
      return NextResponse.json({ user: rows[0] || null });
    }

    if (id) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [
        id,
      ]);
      return NextResponse.json({ user: rows[0] || null });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'authentication required' }, { status: 401 });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [
      session.uid,
    ]);
    return NextResponse.json({ user: rows[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const body = await readBody(request);

  // INTENTIONALLY VULNERABLE (testbed): mass assignment. `role` is accepted,
  // so any signed-in user can promote themselves to admin. No CSRF token is
  // required either.
  const allowed = [
    'username',
    'email',
    'display_name',
    'bio',
    'avatar_url',
    'role',
    'preferences',
  ];
  const fields = allowed.filter((field) => Object.hasOwn(body, field));

  if (!fields.length) {
    return NextResponse.json({ error: 'no editable fields supplied' }, { status: 400 });
  }

  const values = fields.map((field) =>
    field === 'preferences' ? JSON.stringify(body[field] ?? {}) : body[field],
  );
  const assignments = fields.map((field, index) => {
    const placeholder = `$${index + 1}`;
    return field === 'preferences'
      ? `${field} = ${placeholder}::jsonb`
      : `${field} = ${placeholder}`;
  });

  values.push(session.uid);
  const sql = `UPDATE users
                  SET ${assignments.join(', ')}
                WHERE id = $${values.length}
                RETURNING *`;

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ user: rows[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  return PUT(request);
}
