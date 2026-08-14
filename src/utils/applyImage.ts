import { DEFAULT_TRANSFORM } from '../constants/editor';
import type {
  GridCell,
  TransformState,
  UploadedImage,
  UploadedImageId,
} from '../types/editor';
import { normalizeTransform } from './transform';

export function cloneTransform(transform: TransformState): TransformState {
  return normalizeTransform(transform);
}

/**
 * Apply an uploaded image onto a single cell with an independent transform copy.
 */
export function assignImageToCell(
  cell: GridCell,
  uploaded: UploadedImage,
): GridCell {
  return {
    ...cell,
    sourceImageId: uploaded.id,
    resourceId: uploaded.resourceId,
    transform: cloneTransform(uploaded.editorTransform),
  };
}

export function applyImageToAllCells(
  cells: GridCell[],
  uploaded: UploadedImage,
): GridCell[] {
  return cells.map((cell) => assignImageToCell(cell, uploaded));
}

/** Empty = no resourceId */
export function applyImageToEmptyCells(
  cells: GridCell[],
  uploaded: UploadedImage,
): GridCell[] {
  return cells.map((cell) => {
    if (cell.resourceId) return cell;
    return assignImageToCell(cell, uploaded);
  });
}

export function findUploadedImage(
  images: UploadedImage[],
  imageId: UploadedImageId,
): UploadedImage | undefined {
  return images.find((img) => img.id === imageId);
}

export function resolveCellTransform(cell: GridCell): TransformState {
  return cell.transform
    ? cloneTransform(cell.transform)
    : { ...DEFAULT_TRANSFORM };
}
