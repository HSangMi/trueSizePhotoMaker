import { describe, expect, it } from 'vitest';
import { buildGridBorderLines } from './gridBorders';

describe('buildGridBorderLines', () => {
  it('dedupes shared edges when gap is 0', () => {
    const lines = buildGridBorderLines([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    ]);
    // 2 cells side by side: outer box + 1 shared vertical = 4h + 3v? 
    // Each cell 2h+2v = 8, shared vertical counted once → 7
    expect(lines).toHaveLength(7);
    const verticalShared = lines.filter(
      (l) => l.x1 === 10 && l.x2 === 10 && l.y1 === 0 && l.y2 === 10,
    );
    expect(verticalShared).toHaveLength(1);
  });

  it('keeps separate edges when cells are gapped', () => {
    const lines = buildGridBorderLines([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 15, y: 0, width: 10, height: 10 },
    ]);
    // No shared edges → 8
    expect(lines).toHaveLength(8);
  });
});
