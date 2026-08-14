import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import type { GridCell, UploadedImage } from '../types/editor';
import {
  clearCellImage,
  countUploadedImageUsage,
  formatUsageLabel,
  getCellIdsUsingUploadedImage,
  isCellEmpty,
  resolveCellPhotoStatus,
} from './cellManagement';

const uploaded: UploadedImage = {
  id: 'u1',
  name: 'IMG_1234.jpg',
  resourceId: 'r1',
  editorTransform: { ...DEFAULT_TRANSFORM },
};

describe('cellManagement', () => {
  it('clearCellImage removes source, resource, and transform', () => {
    const cell: GridCell = {
      id: 'c1',
      sourceImageId: 'u1',
      resourceId: 'r1',
      transform: { ...DEFAULT_TRANSFORM, scale: 1.5, rotation: 90 },
    };
    expect(clearCellImage(cell)).toEqual({ id: 'c1' });
    expect(isCellEmpty(clearCellImage(cell))).toBe(true);
  });

  it('counts usage by sourceImageId only', () => {
    const cells: GridCell[] = [
      { id: 'c1', sourceImageId: 'u1', resourceId: 'r1' },
      { id: 'c2', sourceImageId: 'u1', resourceId: 'r1' },
      { id: 'c3', sourceImageId: 'u2', resourceId: 'r2' },
      { id: 'c4', resourceId: 'r1' },
    ];
    expect(countUploadedImageUsage(cells, 'u1')).toBe(2);
    expect(countUploadedImageUsage(cells, 'u2')).toBe(1);
    expect(countUploadedImageUsage(cells, 'missing')).toBe(0);
    expect(formatUsageLabel(2)).toBe('사용 중: 2');
    expect(formatUsageLabel(0)).toBe('사용 안 함');
  });

  it('lists cell ids using an uploaded image', () => {
    const cells: GridCell[] = [
      { id: 'c1', sourceImageId: 'u1', resourceId: 'r1' },
      { id: 'c2', sourceImageId: 'u2', resourceId: 'r2' },
      { id: 'c3', sourceImageId: 'u1', resourceId: 'r1' },
    ];
    expect(getCellIdsUsingUploadedImage(cells, 'u1')).toEqual(['c1', 'c3']);
  });

  it('resolves linked / empty / orphan cell photo status', () => {
    expect(
      resolveCellPhotoStatus({ id: 'c0' }, [uploaded]),
    ).toEqual({ kind: 'empty' });

    expect(
      resolveCellPhotoStatus(
        {
          id: 'c1',
          sourceImageId: 'u1',
          resourceId: 'r1',
        },
        [uploaded],
      ),
    ).toEqual({
      kind: 'linked',
      uploaded,
      name: 'IMG_1234.jpg',
    });

    expect(
      resolveCellPhotoStatus(
        { id: 'c2', resourceId: 'r1' },
        [uploaded],
      ),
    ).toEqual({
      kind: 'orphan',
      name: '삭제된 원본 사진',
      resourceId: 'r1',
    });

    expect(
      resolveCellPhotoStatus(
        {
          id: 'c3',
          sourceImageId: 'gone',
          resourceId: 'r1',
        },
        [uploaded],
      ),
    ).toEqual({
      kind: 'orphan',
      name: '삭제된 원본 사진',
      resourceId: 'r1',
    });
  });
});
