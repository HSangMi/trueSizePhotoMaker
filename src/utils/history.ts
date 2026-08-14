import type {
  DocumentSnapshot,
  GridCell,
  TransformState,
  UploadedImage,
} from '../types/editor';
import { normalizeTransform } from './transform';

function cloneTransform(t: TransformState): TransformState {
  return normalizeTransform(t);
}

function cloneUploadedImage(img: UploadedImage): UploadedImage {
  return {
    id: img.id,
    name: img.name,
    resourceId: img.resourceId,
    editorTransform: cloneTransform(img.editorTransform),
  };
}

function cloneGridCell(cell: GridCell): GridCell {
  return {
    id: cell.id,
    sourceImageId: cell.sourceImageId,
    resourceId: cell.resourceId,
    transform: cell.transform ? cloneTransform(cell.transform) : undefined,
  };
}

/**
 * Structural clone of DocumentSnapshot for history.
 * Does NOT clone ImageResource / imageData.
 */
export function createSnapshot(present: DocumentSnapshot): DocumentSnapshot {
  return {
    paper: {
      paperId: present.paper.paperId,
      backgroundColor: present.paper.backgroundColor,
    },
    photoSize: {
      widthMm: present.photoSize.widthMm,
      heightMm: present.photoSize.heightMm,
    },
    grid: {
      gapMm: present.grid.gapMm,
      outerMarginMm: present.grid.outerMarginMm,
      showGridBorders: present.grid.showGridBorders ?? false,
    },
    uploadedImages: present.uploadedImages.map(cloneUploadedImage),
    gridCells: present.gridCells.map(cloneGridCell),
  };
}

/** Structural equality for history no-op detection (IDs + transforms only). */
export function documentsEqual(
  a: DocumentSnapshot,
  b: DocumentSnapshot,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
