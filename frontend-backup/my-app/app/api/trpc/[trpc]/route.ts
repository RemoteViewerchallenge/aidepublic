// my-app/app/api/trpc/[trpc]/route.ts
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const handler = async (
  req: Request,
  { params }: { params: Promise<{ trpc: string }> }
) => {
  const { trpc } = await params;
  const url = new URL(req.url);
  const backendUrl = `${BACKEND_URL}/api/trpc/${trpc}${url.search}`;

  console.log('🔀 API Proxy:', {
    method: req.method,
    endpoint: trpc,
    frontendUrl: req.url,
    backendUrl: backendUrl,
    searchParams: url.search,
  });

  const body = req.method === 'POST' ? await req.text() : undefined;

  if (body) {
    console.log('📤 Proxying request body:', body);
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const incomingHeaders = req.headers;
    const AUTH_HEADER = 'authorization';
    if (incomingHeaders.has(AUTH_HEADER)) {
      forwardHeaders[AUTH_HEADER] = incomingHeaders.get(AUTH_HEADER) ?? '';
    }

    const response = await fetch(backendUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    console.log('📥 Backend response:', {
      status: response.status,
      statusText: response.statusText,
      url: backendUrl,
    });

    const data = await response.text();
    console.log('📄 Backend response body:', data);

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return new Response(JSON.stringify({ error: `Proxy failed: ${error}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export { handler as GET, handler as POST };
