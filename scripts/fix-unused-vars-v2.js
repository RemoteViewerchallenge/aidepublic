import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'backend/src/client/main.ts',
  'backend/src/scripts/index.ts',
  'backend/src/server/router.ts',
  'backend/src/state/StateRepository.test.ts',
  'backend/src/utils/network.ts',
  'frontend/my-app/app/api/proxy-control/route.ts',
  'frontend/my-app/app/api/start-mcp/route.ts',
  'frontend/my-app/app/workspace2/page.tsx',
];

const fixes = [
  {
    file: 'backend/src/client/main.ts',
    replacements: [
      { from: 'BrowserMessageReader', to: '_BrowserMessageReader' },
      { from: 'BrowserMessageWriter', to: '_BrowserMessageWriter' },
    ],
  },
  {
    file: 'backend/src/scripts/index.ts',
    replacements: [{ from: 'client', to: '_client' }],
  },
  {
    file: 'backend/src/server/router.ts',
    replacements: [{ from: 'catch (e)', to: 'catch (_e)' }],
  },
  {
    file: 'backend/src/state/StateRepository.test.ts',
    replacements: [{ from: 'catch (error)', to: 'catch (_error)' }],
  },
  {
    file: 'backend/src/utils/network.ts',
    replacements: [{ from: 'catch (e)', to: 'catch (_e)' }],
  },
  {
    file: 'frontend/my-app/app/api/proxy-control/route.ts',
    replacements: [{ from: 'catch (e)', to: 'catch (_e)' }],
  },
  {
    file: 'frontend/my-app/app/api/start-mcp/route.ts',
    replacements: [
      { from: 'catch (e)', to: 'catch (_e)' },
      { from: 'catch (err)', to: 'catch (_err)' },
    ],
  },
  {
    file: 'frontend/my-app/app/workspace2/page.tsx',
    replacements: [
      { from: 'catch (e)', to: 'catch (_e)' },
      { from: 'catch (err)', to: 'catch (_err)' },
    ],
  },
];

async function fixUnusedVars() {
  for (const fix of fixes) {
    try {
      const filePath = path.join(process.cwd(), fix.file);
      let content = await readFile(filePath, 'utf8');

      for (const replacement of fix.replacements) {
        content = content.replace(
          new RegExp(replacement.from, 'g'),
          replacement.to
        );
      }

      await writeFile(filePath, content);
      console.log(`Updated ${fix.file}`);
    } catch (error) {
      console.error(`Error processing ${fix.file}:`, error);
    }
  }
}

fixUnusedVars().catch(console.error);
