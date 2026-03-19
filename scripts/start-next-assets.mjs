import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export function getStandaloneAssetCopies(projectRoot) {
  const standaloneRoot = path.join(projectRoot, '.next', 'standalone');

  return [
    {
      source: path.join(projectRoot, '.next', 'static'),
      destination: path.join(standaloneRoot, '.next', 'static'),
    },
    {
      source: path.join(projectRoot, 'public'),
      destination: path.join(standaloneRoot, 'public'),
    },
  ];
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function syncStandaloneAssets(projectRoot) {
  for (const { source, destination } of getStandaloneAssetCopies(projectRoot)) {
    if (!(await pathExists(source))) {
      continue;
    }

    await rm(destination, { recursive: true, force: true });
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: true });
  }
}
