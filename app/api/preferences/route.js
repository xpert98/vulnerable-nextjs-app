import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const defaults = {
  digest: 'daily',
  theme: 'paper',
  mentions: true,
};

/**
 * INTENTIONALLY VULNERABLE (testbed): recursive merge with no key filtering.
 * A JSON body containing `__proto__` pollutes Object.prototype for the life
 * of the Node process.
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;

  for (const key in source) {
    const value = source[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [session.uid],
    );
    const stored = rows[0]?.preferences || {};
    return NextResponse.json({ preferences: deepMerge({ ...defaults }, stored) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const body = await readBody(request);

  try {
    const { rows } = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [session.uid],
    );
    const stored = rows[0]?.preferences || {};
    const merged = deepMerge({ ...defaults, ...stored }, body);

    await pool.query('UPDATE users SET preferences = $1::jsonb WHERE id = $2', [
      JSON.stringify(merged),
      session.uid,
    ]);

    return NextResponse.json({
      preferences: merged,
      polluted: Object.prototype.polluted || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
