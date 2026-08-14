import type { DocumentSnapshot, ImageResourceId } from '../types/editor';
import type { HistoryState } from '../types/editor';
import type { ImageResource, ImageResourceRegistry } from '../types/image';

export function collectLiveResourceIds(
  history: HistoryState,
): Set<ImageResourceId> {
  const snaps: DocumentSnapshot[] = [
    ...history.past,
    history.present,
    ...history.future,
  ];
  const ids = new Set<ImageResourceId>();

  for (const snap of snaps) {
    for (const img of snap.uploadedImages) {
      ids.add(img.resourceId);
    }
    for (const cell of snap.gridCells) {
      if (cell.resourceId) {
        ids.add(cell.resourceId);
      }
    }
  }

  return ids;
}

function disposeResource(resource: ImageResource): void {
  if (resource.objectUrl) {
    URL.revokeObjectURL(resource.objectUrl);
  }

  const { imageData } = resource;
  if (
    typeof ImageBitmap !== 'undefined' &&
    imageData instanceof ImageBitmap &&
    typeof imageData.close === 'function'
  ) {
    imageData.close();
  }
}

/**
 * Remove resources not referenced by any history snapshot.
 * Revokes object URLs and closes ImageBitmap handles when possible.
 */
export function pruneOrphanResources(
  resources: ImageResourceRegistry,
  history: HistoryState,
): ImageResourceRegistry {
  const live = collectLiveResourceIds(history);
  const next: ImageResourceRegistry = { ...resources };

  for (const id of Object.keys(next)) {
    if (!live.has(id)) {
      disposeResource(next[id]);
      delete next[id];
    }
  }

  return next;
}
