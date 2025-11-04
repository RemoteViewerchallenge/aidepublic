import 'dotenv/config';
import cron from 'node-cron';
import { spawn } from 'child_process';

// Schedule to run every 12 hours
cron.schedule('0 */12 * * *', () => {
  const sync = spawn('npm', ['run', 'sync-models']);

  sync.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  sync.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  sync.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
});