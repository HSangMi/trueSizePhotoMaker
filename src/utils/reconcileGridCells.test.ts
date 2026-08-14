import { describe, expect, it } from 'vitest';
import type { GridCell } from '../types/editor';
import { reconcileGridCells } from './reconcileGridCells';

function cell(id: string, resourceId?: string): GridCell {
  return { id, resourceId, sourceImageId: resourceId ? `src-${id}` : undefined };
}

describe('reconcileGridCells', () => {
  it('preserves existing ids and data when count is unchanged', () => {
    const existing = [cell('a', 'r1'), cell('b', 'r2')];
    const next = reconcileGridCells(existing, 2);
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('a');
    expect(next[0].resourceId).toBe('r1');
    expect(next[1].id).toBe('b');
  });

  it('removes trailing cells when shrinking', () => {
    const existing = [
      cell('0', 'r0'),
      cell('1', 'r1'),
      cell('2', 'r2'),
      cell('3', 'r3'),
    ];
    const next = reconcileGridCells(existing, 2);
    expect(next.map((c) => c.id)).toEqual(['0', '1']);
    expect(next[0].resourceId).toBe('r0');
  });

  it('keeps existing cells and appends empty ones when growing', () => {
    const existing = [cell('0', 'r0'), cell('1', 'r1')];
    const next = reconcileGridCells(existing, 4);
    expect(next).toHaveLength(4);
    expect(next[0].id).toBe('0');
    expect(next[0].resourceId).toBe('r0');
    expect(next[1].id).toBe('1');
    expect(next[2].id).not.toBe('0');
    expect(next[2].resourceId).toBeUndefined();
    expect(next[3].resourceId).toBeUndefined();
  });

  it('returns empty array for target 0', () => {
    expect(reconcileGridCells([cell('a')], 0)).toEqual([]);
  });

  it('preserves resourceId when sourceImageId is cleared conceptually', () => {
    // Document-level soft delete leaves resourceId; reconcile must not strip it
    const existing: GridCell[] = [
      {
        id: 'c1',
        sourceImageId: undefined,
        resourceId: 'res-keep',
        transform: { scale: 1.1, offsetX: 2, offsetY: 3, rotation: 0 },
      },
    ];
    const next = reconcileGridCells(existing, 1);
    expect(next[0].resourceId).toBe('res-keep');
    expect(next[0].transform?.scale).toBe(1.1);
  });
});
