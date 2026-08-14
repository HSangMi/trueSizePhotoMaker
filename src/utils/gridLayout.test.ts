import { describe, expect, it } from 'vitest';
import { POSTCARD_PAPER } from '../constants/paper';
import { calculateGridLayout } from './gridLayout';
import { mmToPxX, mmToPxY } from './unitConversion';

describe('calculateGridLayout', () => {
  it('packs maximum cells when gap and margin are 0', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 50, heightMm: 70 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );

    // 100/50 = 2 cols, 148/70 = 2 rows
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.cells.length).toBe(4);

    expect(layout.cellWidth).toBeCloseTo(mmToPxX(50, POSTCARD_PAPER));
    expect(layout.cellHeight).toBeCloseTo(mmToPxY(70, POSTCARD_PAPER));
  });

  it('centers remaining space when cells do not fill the paper', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 40, heightMm: 60 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );

    // 100/40 = 2 cols (80 used), 148/60 = 2 rows (120 used)
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);

    const usedW = 2 * mmToPxX(40, POSTCARD_PAPER);
    const usedH = 2 * mmToPxY(60, POSTCARD_PAPER);
    expect(layout.offsetX).toBeCloseTo((POSTCARD_PAPER.widthPx - usedW) / 2);
    expect(layout.offsetY).toBeCloseTo((POSTCARD_PAPER.heightPx - usedH) / 2);
  });

  it('reduces cell count when gap increases', () => {
    const tight = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 30, heightMm: 40 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );
    const gapped = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 30, heightMm: 40 },
      { gapMm: 10, outerMarginMm: 0, showGridBorders: false },
    );

    expect(gapped.cells.length).toBeLessThan(tight.cells.length);
  });

  it('reduces cell count when outerMargin increases', () => {
    const none = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 30, heightMm: 40 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );
    const margined = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 30, heightMm: 40 },
      { gapMm: 0, outerMarginMm: 20, showGridBorders: false },
    );

    expect(margined.cells.length).toBeLessThanOrEqual(none.cells.length);
    expect(margined.cells.length).toBeLessThan(none.cells.length);
  });

  it('returns empty grid when photo is larger than usable area', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 200, heightMm: 200 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );

    expect(layout.columns).toBe(0);
    expect(layout.rows).toBe(0);
    expect(layout.cells).toEqual([]);
  });

  it('returns empty grid for non-finite inputs', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: Number.POSITIVE_INFINITY, heightMm: 70 },
      { gapMm: Number.NaN, outerMarginMm: 0, showGridBorders: false },
    );
    expect(layout.cells).toEqual([]);
  });

  it('uses row-major index order', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 25, heightMm: 37 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );

    expect(layout.columns).toBeGreaterThan(1);
    expect(layout.rows).toBeGreaterThan(1);

    for (let i = 0; i < layout.cells.length; i += 1) {
      const cell = layout.cells[i];
      expect(cell.index).toBe(i);
      expect(cell.row).toBe(Math.floor(i / layout.columns));
      expect(cell.column).toBe(i % layout.columns);
    }
  });

  it('treats outerMargin as minimum and still centers leftover', () => {
    const layout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 40, heightMm: 60 },
      { gapMm: 0, outerMarginMm: 5, showGridBorders: false },
    );

    const marginX = mmToPxX(5, POSTCARD_PAPER);
    const marginY = mmToPxY(5, POSTCARD_PAPER);
    expect(layout.offsetX).toBeGreaterThanOrEqual(marginX - 1e-6);
    expect(layout.offsetY).toBeGreaterThanOrEqual(marginY - 1e-6);
  });
});
