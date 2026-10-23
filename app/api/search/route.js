import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  // INTENTIONALLY VULNERABLE (testbed): direct SQL interpolation.
  const sql = `SELECT n.id, n.title, n.body, n.visibility, n.user_id,
                      n.created_at, u.username
                 FROM notes n
                 JOIN users u ON u.id = n.user_id
                WHERE n.visibility = 'public'
                  AND (n.title ILIKE '%${q}%' OR n.body ILIKE '%${q}%')
                ORDER BY 6 DESC
                LIMIT 50`;

  try {
    const { rows } = await pool.query(sql);
    return NextResponse.json({ query: sql, count: rows.length, results: rows });
  } catch (error) {
    return NextResponse.json(
      { query: sql, error: error.message, results: [] },
      { status: 500 },
    );
  }
}
