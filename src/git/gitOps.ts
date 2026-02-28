import { execa } from 'execa';

export async function ensureCleanWorkingTree(): Promise<void> {
  const res = await execa('git', ['status', '--porcelain']);
  if (res.stdout.trim().length) {
    throw new Error('Working tree is not clean. Commit or stash changes before continuing.');
  }
}

export async function createBranch(name: string): Promise<void> {
  await execa('git', ['checkout', '-b', name]);
}

export async function checkout(branch: string): Promise<void> {
  await execa('git', ['checkout', branch]);
}

export async function commitAll(message: string): Promise<void> {
  await execa('git', ['add', '-A']);
  const res = await execa('git', ['status', '--porcelain']);
  if (!res.stdout.trim().length) return;
  await execa('git', ['commit', '-m', message]);
}
