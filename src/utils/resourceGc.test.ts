import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import type { HistoryState } from '../types/editor';
import type { ImageResourceRegistry } from '../types/image';
import { collectLiveResourceIds, pruneOrphanResources } from './resourceGc';

describe('resource GC', () => {
  it('keeps resources referenced by past/future snapshots', () => {
    const history: HistoryState = {
      past: [
        {
          paper: { paperId: 'postcard', backgroundColor: '#fff' },
          photoSize: { widthMm: 50, heightMm: 70 },
          grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
          uploadedImages: [
            {
              id: 'u1',
              name: 'old.png',
              resourceId: 'old-res',
              editorTransform: { ...DEFAULT_TRANSFORM },
            },
          ],
          gridCells: [],
        },
      ],
      present: {
        paper: { paperId: 'postcard', backgroundColor: '#fff' },
        photoSize: { widthMm: 50, heightMm: 70 },
        grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
        uploadedImages: [],
        gridCells: [{ id: 'c1', resourceId: 'cell-res' }],
      },
      future: [],
    };

    const ids = collectLiveResourceIds(history);
    expect(ids.has('old-res')).toBe(true);
    expect(ids.has('cell-res')).toBe(true);

    const resources: ImageResourceRegistry = {
      'old-res': {
        id: 'old-res',
        imageData: {} as HTMLImageElement,
        width: 1,
        height: 1,
      },
      'cell-res': {
        id: 'cell-res',
        imageData: {} as HTMLImageElement,
        width: 1,
        height: 1,
      },
      orphan: {
        id: 'orphan',
        imageData: {} as HTMLImageElement,
        width: 1,
        height: 1,
      },
    };

    const pruned = pruneOrphanResources(resources, history);
    expect(pruned['old-res']).toBeDefined();
    expect(pruned['cell-res']).toBeDefined();
    expect(pruned.orphan).toBeUndefined();
  });
});
