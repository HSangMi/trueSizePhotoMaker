import { LAYOUT_EPSILON } from '../constants/editor';
import type {
  GridSettings,
  PaperPreset,
  PhotoSizeSettings,
} from '../types/editor';
import type { ComputedGridCell, ComputedGridLayout } from '../types/grid';
import { mmToPxX, mmToPxY } from './unitConversion';

function maxFitCount(
  available: number,
  cellSize: number,
  gap: number,
): number {
  if (
    !Number.isFinite(available) ||
    !Number.isFinite(cellSize) ||
    !Number.isFinite(gap) ||
    cellSize <= 0 ||
    available + LAYOUT_EPSILON < cellSize
  ) {
    return 0;
  }
  const stride = cellSize + gap;
  if (!(stride > 0)) {
    return 0;
  }
  // n * cell + (n - 1) * gap <= available
  // n * (cell + gap) <= available + gap
  const n = Math.floor((available + gap + LAYOUT_EPSILON) / stride);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Pure layout from paper + photo size + grid settings.
 * Cells are not stored with positions; this recomputes them every time.
 */
export function calculateGridLayout(
  paper: PaperPreset,
  photoSize: PhotoSizeSettings,
  grid: GridSettings,
): ComputedGridLayout {
  const empty: ComputedGridLayout = {
    columns: 0,
    rows: 0,
    cellWidth: 0,
    cellHeight: 0,
    gapX: 0,
    gapY: 0,
    usedWidth: 0,
    usedHeight: 0,
    offsetX: 0,
    offsetY: 0,
    cells: [],
  };

  if (
    !Number.isFinite(photoSize.widthMm) ||
    !Number.isFinite(photoSize.heightMm) ||
    !Number.isFinite(grid.gapMm) ||
    !Number.isFinite(grid.outerMarginMm) ||
    photoSize.widthMm <= 0 ||
    photoSize.heightMm <= 0 ||
    grid.gapMm < 0 ||
    grid.outerMarginMm < 0
  ) {
    return empty;
  }

  const cellWidth = mmToPxX(photoSize.widthMm, paper);
  const cellHeight = mmToPxY(photoSize.heightMm, paper);
  const gapX = mmToPxX(grid.gapMm, paper);
  const gapY = mmToPxY(grid.gapMm, paper);
  const marginX = mmToPxX(grid.outerMarginMm, paper);
  const marginY = mmToPxY(grid.outerMarginMm, paper);

  if (
    !Number.isFinite(cellWidth) ||
    !Number.isFinite(cellHeight) ||
    !Number.isFinite(gapX) ||
    !Number.isFinite(gapY) ||
    !Number.isFinite(marginX) ||
    !Number.isFinite(marginY)
  ) {
    return empty;
  }

  const availableWidth = paper.widthPx - marginX * 2;
  const availableHeight = paper.heightPx - marginY * 2;

  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(availableHeight) ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return empty;
  }

  const columns = maxFitCount(availableWidth, cellWidth, gapX);
  const rows = maxFitCount(availableHeight, cellHeight, gapY);

  if (columns === 0 || rows === 0) {
    return {
      ...empty,
      cellWidth,
      cellHeight,
      gapX,
      gapY,
    };
  }

  const usedWidth = columns * cellWidth + (columns - 1) * gapX;
  const usedHeight = rows * cellHeight + (rows - 1) * gapY;

  // outerMargin is a minimum; remaining space is centered
  const offsetX = marginX + (availableWidth - usedWidth) / 2;
  const offsetY = marginY + (availableHeight - usedHeight) / 2;

  const cells: ComputedGridCell[] = [];
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({
        // Temporary id for layout-only cells; store reconcile assigns real ids
        id: `layout-${index}`,
        index,
        row,
        column,
        x: offsetX + column * (cellWidth + gapX),
        y: offsetY + row * (cellHeight + gapY),
        width: cellWidth,
        height: cellHeight,
      });
      index += 1;
    }
  }

  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    gapX,
    gapY,
    usedWidth,
    usedHeight,
    offsetX,
    offsetY,
    cells,
  };
}
