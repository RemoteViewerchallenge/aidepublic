import { spawnSync } from 'child_process';
import fs from 'fs';

import { NextResponse } from 'next/server';

const ALLOWED = ((): string[] => {
  try {
    const conf = JSON.parse(fs.readFileSync('config/proxy_ports.json', 'utf8'));
    return Object.keys(conf || {});
  } catch (_e) {
    return [];
  }
})();

function checkToken(req: Request) {
  const token = req.headers.get('x-proxy-token') || '';
  return token === (process.env.PROXY_CONTROL_TOKEN || '');
}

export async function POST(req: Request) {
  if (!checkToken(req))
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  const body = await req.json();
  const { action, stack } = body || {};
  if (!action || !stack)
    return NextResponse.json(
      { ok: false, error: 'action and stack required' },
      { status: 400 }
    );
  if (!ALLOWED.includes(stack))
    return NextResponse.json(
      { ok: false, error: 'stack not allowed' },
      { status: 403 }
    );

  const script = './scripts/proxy-control.sh';
  const res = spawnSync(script, [action, stack], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return NextResponse.json({
    ok: res.status === 0,
    stdout: res.stdout,
    stderr: res.stderr,
    code: res.status,
  });
}

export async function GET(req: Request) {
  // list allowed stacks
  if (!checkToken(req))
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  return NextResponse.json({ ok: true, allowed: ALLOWED });
}
