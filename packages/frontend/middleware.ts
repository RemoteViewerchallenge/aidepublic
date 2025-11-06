import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(_req: NextRequest) {
  const res = NextResponse.next();

  // Simple middleware - no Puck routing needed anymore
  // All routes go through normal Next.js routing

  return res;
}
