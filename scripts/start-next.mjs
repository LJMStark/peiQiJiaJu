import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { syncStandaloneAssets } from './start-next-assets.mjs';

const port = process.env.PORT?.trim() || '3000';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const standaloneServerPath = fileURLToPath(new URL('../.next/standalone/server.js', import.meta.url));
const nextBinPath = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const hasStandaloneBuild = existsSync(standaloneServerPath);

if (hasStandaloneBuild) {
  await syncStandaloneAssets(projectRoot);
}

const commandArgs = hasStandaloneBuild
  ? [standaloneServerPath]
  : [nextBinPath, 'start', '-p', port];

const child = spawn(process.execPath, commandArgs, {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Failed to start Next.js.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
