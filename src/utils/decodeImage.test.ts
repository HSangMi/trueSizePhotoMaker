import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import {
  createUploadedImage,
  decodeImageFilesForUpload,
  isAcceptedImageFile,
} from './decodeImage';

describe('decodeImage helpers', () => {
  it('accepts jpeg/png/webp only', () => {
    expect(isAcceptedImageFile(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(
      true,
    );
    expect(isAcceptedImageFile(new File([], 'a.png', { type: 'image/png' }))).toBe(
      true,
    );
    expect(
      isAcceptedImageFile(new File([], 'a.webp', { type: 'image/webp' })),
    ).toBe(true);
    expect(isAcceptedImageFile(new File([], 'a.gif', { type: 'image/gif' }))).toBe(
      false,
    );
    expect(isAcceptedImageFile(new File([], 'a.jpg', { type: '' }))).toBe(true);
  });

  it('creates UploadedImage with default transform', () => {
    const img = createUploadedImage('photo.png', 'res-1');
    expect(img.name).toBe('photo.png');
    expect(img.resourceId).toBe('res-1');
    expect(img.editorTransform).toEqual(DEFAULT_TRANSFORM);
    expect(img.id).toBeTruthy();
  });

  it('reports skippedLimit when remaining slots are insufficient', async () => {
    const files = [
      new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }),
      new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }),
      new File([new Uint8Array([1])], 'c.png', { type: 'image/png' }),
    ];

    // Force decode failure so we only assert limit slicing behavior + failures
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => undefined,
    });

    const result = await decodeImageFilesForUpload(files, 2);
    expect(result.skippedLimit).toBe(1);
    expect(result.uploadedImages.length).toBe(0);
    expect(result.failed.length).toBe(2);

    vi.unstubAllGlobals();
  });

  it('rejects unsupported mime without consuming slots', async () => {
    const files = [
      new File([], 'x.gif', { type: 'image/gif' }),
      new File([], 'y.txt', { type: 'text/plain' }),
    ];
    const result = await decodeImageFilesForUpload(files, 5);
    expect(result.skippedLimit).toBe(0);
    expect(result.uploadedImages.length).toBe(0);
    expect(result.failed).toHaveLength(2);
  });
});
