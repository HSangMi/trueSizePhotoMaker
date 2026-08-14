import { describe, expect, it, vi } from 'vitest';
import { takeFilesFromFileInput } from './fileInput';
import { isAcceptedImageFile } from './decodeImage';

describe('takeFilesFromFileInput', () => {
  it('copies FileList before clearing input value (live FileList)', () => {
    const fileA = new File([new Uint8Array([1])], 'a.jpg', {
      type: 'image/jpeg',
    });
    const fileB = new File([new Uint8Array([2])], 'b.png', {
      type: 'image/png',
    });

    let stored: File[] = [fileA, fileB];
    const input = {
      get files() {
        if (stored.length === 0) return null;
        return {
          length: stored.length,
          item: (i: number) => stored[i] ?? null,
          [Symbol.iterator]: function* () {
            yield* stored;
          },
          0: stored[0],
          1: stored[1],
        } as unknown as FileList;
      },
      set value(_v: string) {
        // Browsers clear the live FileList when value is reset.
        stored = [];
      },
      get value() {
        return '';
      },
    } as HTMLInputElement;

    const files = takeFilesFromFileInput(input);
    expect(files).toHaveLength(2);
    expect(files[0]?.name).toBe('a.jpg');
    expect(files[1]?.name).toBe('b.png');
    expect(stored).toHaveLength(0);
  });

  it('returns empty array when no files selected', () => {
    const input = {
      files: null,
      value: '',
    } as HTMLInputElement;
    const spy = vi.fn();
    Object.defineProperty(input, 'value', {
      set: spy,
      get: () => '',
    });
    expect(takeFilesFromFileInput(input)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('');
  });
});

describe('isAcceptedImageFile empty MIME fallback', () => {
  it('accepts jpeg/png/webp by extension when type is empty', () => {
    expect(
      isAcceptedImageFile(new File([], 'photo.JPG', { type: '' })),
    ).toBe(true);
    expect(
      isAcceptedImageFile(new File([], 'photo.png', { type: '' })),
    ).toBe(true);
    expect(
      isAcceptedImageFile(new File([], 'photo.webp', { type: '' })),
    ).toBe(true);
    expect(
      isAcceptedImageFile(new File([], 'photo.gif', { type: '' })),
    ).toBe(false);
  });
});
