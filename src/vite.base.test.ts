import { describe, expect, it } from 'vitest';
import { normalizeBasePath, resolveBase } from '../vite.base';

describe('vite base path for GitHub Pages', () => {
  it('normalizes BASE_PATH values', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(normalizeBasePath('/trueSizePhotoMaker')).toBe(
      '/trueSizePhotoMaker/',
    );
    expect(normalizeBasePath('/trueSizePhotoMaker/')).toBe(
      '/trueSizePhotoMaker/',
    );
    expect(normalizeBasePath('trueSizePhotoMaker')).toBe(
      '/trueSizePhotoMaker/',
    );
    expect(normalizeBasePath('')).toBeNull();
    expect(normalizeBasePath(undefined)).toBeNull();
  });

  it('prefers BASE_PATH over GITHUB_REPOSITORY', () => {
    expect(
      resolveBase({
        BASE_PATH: '/custom/',
        GITHUB_REPOSITORY: 'hsangmi/trueSizePhotoMaker',
      }),
    ).toBe('/custom/');
  });

  it('uses repository name for Project Pages', () => {
    expect(
      resolveBase({
        GITHUB_REPOSITORY: 'hsangmi/trueSizePhotoMaker',
      }),
    ).toBe('/trueSizePhotoMaker/');
  });

  it('uses / for user github.io sites', () => {
    expect(
      resolveBase({
        GITHUB_REPOSITORY: 'hsangmi/hsangmi.github.io',
      }),
    ).toBe('/');
  });

  it('defaults to / for local builds', () => {
    expect(resolveBase({})).toBe('/');
  });
});
