import type { GridCell } from '../types/editor';

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Keep existing cells in row-major order up to targetCount.
 * Truncate from the end when shrinking; append empty cells when growing.
 * Preserves ids and data for kept cells.
 */
export function reconcileGridCells(
  existingCells: GridCell[],
  targetCount: number,
): GridCell[] {
  const safeTarget = Math.max(0, Math.floor(targetCount));

  if (safeTarget === existingCells.length) {
    return existingCells.map((cell) => ({ ...cell }));
  }

  if (safeTarget < existingCells.length) {
    return existingCells.slice(0, safeTarget).map((cell) => ({ ...cell }));
  }

  const next = existingCells.map((cell) => ({ ...cell }));
  for (let i = existingCells.length; i < safeTarget; i += 1) {
    next.push({ id: createId() });
  }
  return next;
}

export function createEmptyGridCell(): GridCell {
  return { id: createId() };
}
