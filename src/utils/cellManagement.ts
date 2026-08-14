import type {
  GridCell,
  GridCellId,
  UploadedImage,
  UploadedImageId,
} from '../types/editor';

/** Empty cell = no pixel resource assigned. */
export function isCellEmpty(cell: GridCell): boolean {
  return !cell.resourceId;
}

/**
 * Clear image assignment from a cell.
 * Leaves only the cell id (source/resource/transform removed).
 */
export function clearCellImage(cell: GridCell): GridCell {
  return { id: cell.id };
}

/** How many cells currently reference this upload via sourceImageId. */
export function countUploadedImageUsage(
  cells: GridCell[],
  imageId: UploadedImageId,
): number {
  return cells.filter((cell) => cell.sourceImageId === imageId).length;
}

/** Cell ids that use the given uploaded image (sourceImageId match). */
export function getCellIdsUsingUploadedImage(
  cells: GridCell[],
  imageId: UploadedImageId,
): GridCellId[] {
  return cells
    .filter((cell) => cell.sourceImageId === imageId)
    .map((cell) => cell.id);
}

export type CellPhotoStatus =
  | { kind: 'empty' }
  | {
      kind: 'linked';
      uploaded: UploadedImage;
      name: string;
    }
  | {
      kind: 'orphan';
      /** Present when sourceImageId was cleared or upload removed */
      name: string;
      resourceId: string;
    };

/**
 * Resolve how a cell's photo relates to the upload list.
 * Orphan = has resourceId but no matching UploadedImage (list-deleted).
 */
export function resolveCellPhotoStatus(
  cell: GridCell,
  uploadedImages: UploadedImage[],
): CellPhotoStatus {
  if (!cell.resourceId) {
    return { kind: 'empty' };
  }

  if (cell.sourceImageId) {
    const uploaded = uploadedImages.find((u) => u.id === cell.sourceImageId);
    if (uploaded) {
      return { kind: 'linked', uploaded, name: uploaded.name };
    }
  }

  return {
    kind: 'orphan',
    name: '삭제된 원본 사진',
    resourceId: cell.resourceId,
  };
}

export function formatUsageLabel(count: number): string {
  return count > 0 ? `사용 중: ${count}` : '사용 안 함';
}
