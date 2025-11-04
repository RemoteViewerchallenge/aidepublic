import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const files = [
  'backend/src/server/router.ts',
  'backend/src/state/StateRepository.test.ts',
  'backend/src/utils/network.ts',
  'frontend/my-app/app/api/proxy-control/route.ts',
  'frontend/my-app/app/api/start-mcp/route.ts',
  'frontend/my-app/app/workspace2/page.tsx',
];

const patterns = [
  /(catch\s*\(\s*)(e|err|error)(\s*(?:\:\s*[^)]+)?\s*\))/g,
  // also handle catch without parentheses spacing
  /(catch\s*\(\s*)([A-Za-z_$][\w$]*)(\s*(?:\:\s*[^)]+)?\s*\))/g,
];

async function fix() {
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    try {
      let content = await readFile(p, 'utf8');
      let original = content;
      // First, specifically target common names e/err/error
      content = content.replace(
        /(catch\s*\(\s*)(e|err|error)(\s*(?:\:\s*[^)]+)?\s*\))/g,
        (m, pre, name, rest) => {
          return `${pre}_${name}${rest}`;
        }
      );
      // As fallback, prefix any single-letter catch param (common pattern)
      content = content.replace(
        /(catch\s*\(\s*)([a-zA-Z])(?=\s*(?:\:\s*[^)]+)?\s*\))/g,
        (m, pre, name) => {
          return `${pre}_${name}`;
        }
      );

      if (content !== original) {
        await writeFile(p, content, 'utf8');
        console.log(`Updated ${f}`);
      } else {
        console.log(`No changes for ${f}`);
      }
    } catch (err) {
      console.error(`Failed ${f}: ${err.message}`);
    }
  }
}

fix().catch(e => {
  console.error(e);
  process.exit(1);
});
