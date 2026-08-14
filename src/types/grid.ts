import type { GridCellId } from './editor';

export interface ComputedGridCell {
  id: GridCellId;
  index: number;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedGridLayout {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gapX: number;
  gapY: number;
  usedWidth: number;
  usedHeight: number;
  /** Left origin after outerMargin + remaining-space centering */
  offsetX: number;
  /** Top origin after outerMargin + remaining-space centering */
  offsetY: number;
  cells: ComputedGridCell[];
}
