import { spawn } from 'child_process';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: 'No command provided' },
        { status: 400 }
      );
    }

    // Execute the command
    const child = spawn(command, [], {
      shell: true,
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', data => {
      output += data.toString();
    });

    child.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    return new Promise(resolve => {
      child.on('close', code => {
        resolve(
          NextResponse.json({
            output: output || errorOutput,
            exitCode: code,
          })
        );
      });
    });
  } catch (error) {
    console.error('Terminal API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute command' },
      { status: 500 }
    );
  }
}
