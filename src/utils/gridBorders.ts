/**
 * Unique axis-aligned border segments for grid cell rectangles.
 * Shared edges (gap=0) are stored once so stroke does not double up.
 */

export interface GridBorderLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GridBorderRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function horizontalKey(y: number, x1: number, x2: number): string {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  return `h:${roundCoord(y)}:${roundCoord(lo)}:${roundCoord(hi)}`;
}

function verticalKey(x: number, y1: number, y2: number): string {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  return `v:${roundCoord(x)}:${roundCoord(lo)}:${roundCoord(hi)}`;
}

/**
 * Build unique horizontal/vertical edges for the given cell rects.
 */
export function buildGridBorderLines(
  cells: GridBorderRect[],
): GridBorderLine[] {
  const seen = new Set<string>();
  const lines: GridBorderLine[] = [];

  const addHorizontal = (y: number, x1: number, x2: number) => {
    const key = horizontalKey(y, x1, x2);
    if (seen.has(key)) return;
    seen.add(key);
    lines.push({
      x1: Math.min(x1, x2),
      y1: y,
      x2: Math.max(x1, x2),
      y2: y,
    });
  };

  const addVertical = (x: number, y1: number, y2: number) => {
    const key = verticalKey(x, y1, y2);
    if (seen.has(key)) return;
    seen.add(key);
    lines.push({
      x1: x,
      y1: Math.min(y1, y2),
      x2: x,
      y2: Math.max(y1, y2),
    });
  };

  for (const cell of cells) {
    if (
      !Number.isFinite(cell.x) ||
      !Number.isFinite(cell.y) ||
      !Number.isFinite(cell.width) ||
      !Number.isFinite(cell.height) ||
      cell.width <= 0 ||
      cell.height <= 0
    ) {
      continue;
    }
    const { x, y, width, height } = cell;
    const right = x + width;
    const bottom = y + height;
    addHorizontal(y, x, right);
    addHorizontal(bottom, x, right);
    addVertical(x, y, bottom);
    addVertical(right, y, bottom);
  }

  return lines;
}
