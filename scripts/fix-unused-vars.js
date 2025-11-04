import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of files with unused variables
const filesToFix = [
  'backend/src/client/main.ts',
  'backend/src/scripts/index.ts',
  'backend/src/server/router.ts',
  'backend/src/state/StateRepository.test.ts',
  'backend/src/utils/network.ts',
  'frontend/my-app/app/api/proxy-control/route.ts',
  'frontend/my-app/app/api/start-mcp/route.ts',
  'frontend/my-app/app/workspace2/page.tsx',
  'frontend/my-app/components/MonacoCodeEditor.tsx',
  'frontend/my-app/components/RoleMcpSelector.tsx',
  'frontend/my-app/components/XtermTerminalCore.tsx',
  'frontend/my-app/middleware.ts',
];

const variableReplacements = {
  BrowserMessageReader: '_BrowserMessageReader',
  BrowserMessageWriter: '_BrowserMessageWriter',
  client: '_client',
  e: '_e',
  error: '_error',
  err: '_err',
  widget: '_widget',
  data: '_data',
  req: '_req',
};

// Process each file
filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Replace each variable
  Object.entries(variableReplacements).forEach(([oldVar, newVar]) => {
    const regex = new RegExp(`\\b${oldVar}\\b`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, newVar);
      modified = true;
      console.log(`Replaced ${oldVar} with ${newVar} in ${filePath}`);
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
  }
});
