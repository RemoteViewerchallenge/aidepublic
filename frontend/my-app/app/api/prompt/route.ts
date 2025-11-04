import { NextResponse } from 'next/server';
import * as os from 'os';

export async function GET() {
  try {
    // Get username
    const username = os.userInfo().username;

    // Get current working directory
    const cwd = process.cwd();

    // Get directory name (basename)
    const dirName = cwd.split('/').pop() || cwd.split('\\').pop() || cwd;

    // Create prompt like: user@directory$
    const prompt = `${username}@${dirName}$ `;

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Prompt API error:', error);
    return NextResponse.json(
      { error: 'Failed to get prompt' },
      { status: 500 }
    );
  }
}
