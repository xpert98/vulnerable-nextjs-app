import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ ok: true, service: 'beacon-app', db: 'up' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, service: 'beacon-app', db: 'down', error: error.message },
      { status: 503 },
    );
  }
}
