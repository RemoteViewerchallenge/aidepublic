/**
 * This file is the tRPC API endpoint for the Next.js app.
 * It proxies all requests from `/api/trpc/*` to the backend tRPC server.
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';

const handler = (req: NextRequest) => {
  // The NEXT_PUBLIC_API_URL should point to your backend tRPC server.
  // e.g., http://localhost:3000/api/trpc
  const apiEndpoint = process.env.NEXT_PUBLIC_API_URL;

  if (!apiEndpoint) {
    console.error('❌ NEXT_PUBLIC_API_URL is not set!');
    return new Response(
      JSON.stringify({
        error: { message: 'API endpoint not configured on the server.' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward the request to the backend tRPC server
  return fetch(`${apiEndpoint}${req.nextUrl.pathname}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
};

export { handler as GET, handler as POST };
