import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * GitHub Project Pages needs `base: '/<repo>/'`.
 * Priority:
 * 1. BASE_PATH env (set by CI or local override)
 * 2. GITHUB_REPOSITORY env (owner/repo) when present
 * 3. '/' for local dev / user-site repos
 */
function resolveBase(): string {
  const fromEnv = process.env.BASE_PATH?.trim();
  if (fromEnv) {
    if (fromEnv === '/') return '/';
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`;
  }

  const githubRepo = process.env.GITHUB_REPOSITORY?.trim();
  if (githubRepo) {
    const [owner, name] = githubRepo.split('/');
    if (owner && name === `${owner}.github.io`) {
      return '/';
    }
    if (name) {
      return `/${name}/`;
    }
  }

  return '/';
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
