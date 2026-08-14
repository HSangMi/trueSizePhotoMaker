/**
 * Shared Vite/GitHub Pages base-path helpers (no Vite runtime dependency).
 */

export function normalizeBasePath(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/**
 * GitHub Project Pages needs `base: '/<repo>/'`.
 * Priority:
 * 1. BASE_PATH env (CI / local override)
 * 2. GITHUB_REPOSITORY env (owner/repo)
 * 3. '/' for local dev
 */
export function resolveBase(
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = normalizeBasePath(env.BASE_PATH);
  if (fromEnv) return fromEnv;

  const githubRepo = env.GITHUB_REPOSITORY?.trim();
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
