import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_REPO = 'mcpjungle/MCPJungle';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

const BIN_DIR = path.resolve(__dirname, '..', 'bin');
const DOWNLOAD_DIR = path.resolve(__dirname, '..', 'tmp_download');

async function download() {
  try {
    const platform = os.platform();
    const arch = os.arch();

    let assetName;
    if (platform === 'linux' && arch === 'x64') {
      assetName = 'mcpjungle_Linux_x86_64.tar.gz';
    } else if (platform === 'darwin' && arch === 'x64') {
      assetName = 'mcpjungle_Darwin_x86_64.tar.gz';
    } else if (platform === 'darwin' && arch === 'arm64') {
      assetName = 'mcpjungle_Darwin_arm64.tar.gz';
    } else if (platform === 'win32' && arch === 'x64') {
      assetName = 'mcpjungle_Windows_x86_64.zip';
    } else {
      console.error(`Unsupported platform: ${platform}-${arch}`);
      process.exit(1);
    }

    const releaseData = await fetch(LATEST_RELEASE_URL).then(res => res.json());
    const asset = releaseData.assets.find(a => a.name === assetName);

    if (!asset) {
      console.error(`Could not find asset for ${assetName}`);
      process.exit(1);
    }

    const downloadUrl = asset.browser_download_url;
    const downloadPath = path.join(DOWNLOAD_DIR, assetName);
    const binPath = path.join(BIN_DIR, 'mcpjungle');

    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    const downloadCommand = `curl -L -o ${downloadPath} ${downloadUrl}`;
    exec(downloadCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading mcpjungle: ${error.message}`);
        process.exit(1);
      }
      if (stderr) {
        // curl progress is printed to stderr, so we can't treat it as an error
        // console.error(`Error downloading mcpjungle: ${stderr}`);
        // process.exit(1);
      }

      const extractCommand = `tar -xzf ${downloadPath} -C ${BIN_DIR}`;
      exec(extractCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error extracting archive: ${error.message}`);
          process.exit(1);
        }
        if (stderr) {
          console.error(`Error extracting archive: ${stderr}`);
          // process.exit(1);
        }
        
        fs.chmodSync(path.join(BIN_DIR, 'mcpjungle'), '755');
        console.log(`Downloaded and installed mcpjungle to ${binPath}`);
        
        // Clean up the downloaded archive
        fs.unlinkSync(downloadPath);
        fs.rmdirSync(DOWNLOAD_DIR);
      });
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

download();