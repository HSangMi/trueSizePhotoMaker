import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import type { GridCell, TransformState, UploadedImage } from '../types/editor';
import {
  applyImageToAllCells,
  applyImageToEmptyCells,
  assignImageToCell,
} from './applyImage';

function uploaded(
  id: string,
  resourceId: string,
  transform: TransformState = DEFAULT_TRANSFORM,
): UploadedImage {
  return {
    id,
    name: `${id}.png`,
    resourceId,
    editorTransform: { ...transform },
  };
}

describe('applyImage helpers', () => {
  it('copies transform independently per cell', () => {
    const source = uploaded('u1', 'r1', {
      scale: 1.5,
      offsetX: 10,
      offsetY: -5,
      rotation: 0,
    });
    const cell: GridCell = { id: 'c1' };
    const next = assignImageToCell(cell, source);

    expect(next.sourceImageId).toBe('u1');
    expect(next.resourceId).toBe('r1');
    expect(next.transform).toEqual(source.editorTransform);
    expect(next.transform).not.toBe(source.editorTransform);

    source.editorTransform.scale = 9;
    expect(next.transform?.scale).toBe(1.5);
  });

  it('applyImageToAllCells overwrites every cell with independent transforms', () => {
    const source = uploaded('u1', 'r1', { scale: 1.2, offsetX: 1, offsetY: 2, rotation: 0 });
    const cells: GridCell[] = [
      { id: 'c0', resourceId: 'old', transform: { ...DEFAULT_TRANSFORM } },
      { id: 'c1' },
    ];

    const next = applyImageToAllCells(cells, source);
    expect(next).toHaveLength(2);
    expect(next[0].resourceId).toBe('r1');
    expect(next[1].resourceId).toBe('r1');
    expect(next[0].transform).not.toBe(next[1].transform);
    expect(next[0].transform).not.toBe(source.editorTransform);
  });

  it('applyImageToEmptyCells only fills cells without resourceId', () => {
    const source = uploaded('u2', 'r2');
    const cells: GridCell[] = [
      { id: 'c0', resourceId: 'keep', sourceImageId: 'old' },
      { id: 'c1' },
      { id: 'c2', resourceId: undefined },
    ];

    const next = applyImageToEmptyCells(cells, source);
    expect(next[0].resourceId).toBe('keep');
    expect(next[0].sourceImageId).toBe('old');
    expect(next[1].resourceId).toBe('r2');
    expect(next[1].sourceImageId).toBe('u2');
    expect(next[2].resourceId).toBe('r2');
  });
});
