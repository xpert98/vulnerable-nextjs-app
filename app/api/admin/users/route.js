import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * INTENTIONALLY VULNERABLE (testbed): no authentication and no role check.
 * This endpoint lives under /api/admin but is readable by anyone.
 */
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.oidc_subject, u.username, u.email, u.display_name,
              u.role, u.bio, u.avatar_url, u.created_at,
              COUNT(n.id)::int AS note_count
         FROM users u
         LEFT JOIN notes n ON n.user_id = u.id
        GROUP BY u.id
        ORDER BY u.id ASC`,
    );

    return NextResponse.json({ count: rows.length, users: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
