import { spawn } from 'child_process';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

function findScript(): string | null {
  const candidates = [
    path.join(process.cwd(), 'start-servers.sh'),
    path.join(process.cwd(), '..', 'start-servers.sh'),
    path.join(process.cwd(), '..', '..', 'start-servers.sh'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export async function POST() {
  const script = findScript();
  if (!script) {
    return NextResponse.json(
      { ok: false, error: 'start-servers.sh not found' },
      { status: 500 }
    );
  }

  try {
    // spawn detached so it continues after this process returns
    const child = spawn('bash', [script], {
      cwd: path.dirname(script),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return NextResponse.json({ ok: true, pid: child.pid });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // check if MCPJungle (admin) is reachable
  try {
    const res = await fetch('http://localhost:8080/api/v0/servers');
    if (res.ok) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { ok: false, status: res.status },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'unreachable' },
      { status: 502 }
    );
  }
}
