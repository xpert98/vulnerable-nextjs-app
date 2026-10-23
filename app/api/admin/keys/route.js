import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * INTENTIONALLY VULNERABLE (testbed): no authentication, and the tokens are
 * stored/returned in plaintext.
 */
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT k.id, k.name, k.token, k.created_at, k.owner_id, u.username
         FROM api_keys k
         LEFT JOIN users u ON u.id = k.owner_id
        ORDER BY k.id ASC`,
    );

    return NextResponse.json({ count: rows.length, keys: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
