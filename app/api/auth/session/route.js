import { NextResponse } from 'next/server';
import { getCurrentUser, getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, session: null, user: null });
  }

  const user = await getCurrentUser();

  return NextResponse.json({
    authenticated: true,
    session,
    user,
  });
}
