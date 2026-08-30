import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Version, git commit and boot time — resolved once at process start. */
export interface BuildInfo {
  version: string;
  commit: string;
  started_at: string;
}

const STARTED_AT = new Date().toISOString();

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * The commit the running process was built from. Prefers an env var injected at
 * build/deploy time (most hosts set one), and falls back to reading the local
 * .git when it is present (dev).
 */
function readCommit(): string {
  const fromEnv =
    process.env.COMMIT_SHA ??
    process.env.GIT_COMMIT ??
    process.env.RENDER_GIT_COMMIT ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.SOURCE_VERSION;
  if (fromEnv) return fromEnv.slice(0, 12);

  try {
    // Walk up from cwd looking for a .git directory.
    let dir = process.cwd();
    for (let i = 0; i < 5; i += 1) {
      const gitDir = join(dir, '.git');
      if (existsSync(gitDir)) {
        const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
        const ref = head.startsWith('ref:') ? head.slice(5).trim() : null;
        const sha = ref ? readFileSync(join(gitDir, ref), 'utf8').trim() : head;
        return sha.slice(0, 12);
      }
      dir = join(dir, '..');
    }
  } catch {
    // ignore — fall through to unknown
  }
  return 'unknown';
}

const CACHED: BuildInfo = {
  version: readVersion(),
  commit: readCommit(),
  started_at: STARTED_AT,
};

export function buildInfo(): BuildInfo {
  return CACHED;
}
