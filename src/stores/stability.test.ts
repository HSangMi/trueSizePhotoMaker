import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument, DEFAULT_TRANSFORM } from '../constants/editor';
import { getPaperPreset, POSTCARD_PAPER } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { buildExportScene } from '../utils/exportPng';
import { calculateGridLayout } from '../utils/gridLayout';
import { reconcileGridCells } from '../utils/reconcileGridCells';
import { collectLiveResourceIds, pruneOrphanResources } from '../utils/resourceGc';

function resetStore() {
  const paper = getPaperPreset(createInitialDocument().paper.paperId);
  const doc = createInitialDocument();
  const layout = calculateGridLayout(paper, doc.photoSize, doc.grid);
  const present = {
    ...doc,
    gridCells: reconcileGridCells([], layout.cells.length),
    uploadedImages: [
      {
        id: 'img-a',
        name: 'a.png',
        resourceId: 'res-a',
        editorTransform: { ...DEFAULT_TRANSFORM },
      },
    ],
  };

  useEditorStore.setState({
    resources: {
      'res-a': {
        id: 'res-a',
        imageData: {} as HTMLImageElement,
        width: 200,
        height: 100,
      },
    },
    history: { past: [], present, future: [] },
    selectedTarget: null,
    isDirty: false,
    transformBaseline: null,
    isColorDirty: false,
    colorBaseline: null,
  });
}

describe('stability: delete / GC / export', () => {
  beforeEach(() => {
    resetStore();
  });

  it('keeps cell resource after upload-list delete and does not GC it', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().applyImageToCell(cellId, 'img-a');
    useEditorStore.getState().removeFromUploadList('img-a');

    const present = useEditorStore.getState().history.present;
    const cell = present.gridCells.find((c) => c.id === cellId);
    expect(cell?.sourceImageId).toBeUndefined();
    expect(cell?.resourceId).toBe('res-a');
    expect(useEditorStore.getState().resources['res-a']).toBeDefined();

    const scene = buildExportScene(
      present,
      useEditorStore.getState().resources,
      POSTCARD_PAPER,
    );
    const exported = scene.cells.find((c) => c.image);
    expect(exported?.image).toBeDefined();
  });

  it('keeps resources referenced by past/future after undo clears present upload', () => {
    useEditorStore.getState().removeFromUploadList('img-a');
    // past still references res-a via previous uploadedImages
    expect(
      collectLiveResourceIds(useEditorStore.getState().history).has('res-a'),
    ).toBe(true);
    expect(useEditorStore.getState().resources['res-a']).toBeDefined();

    const pruned = pruneOrphanResources(
      useEditorStore.getState().resources,
      useEditorStore.getState().history,
    );
    expect(pruned['res-a']).toBeDefined();
  });

  it('rejects invalid photo size commits', () => {
    const before = useEditorStore.getState().history.present.photoSize;
    useEditorStore.getState().setPhotoSize({ widthMm: Number.NaN });
    useEditorStore.getState().setPhotoSize({ widthMm: 0 });
    useEditorStore.getState().setPhotoSize({ heightMm: -10 });
    expect(useEditorStore.getState().history.present.photoSize).toEqual(before);
  });

  it('returns empty grid safely for oversized photo / margin', () => {
    const oversized = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 500, heightMm: 500 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );
    expect(oversized.cells).toEqual([]);
    expect(oversized.columns).toBe(0);

    const margined = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: 50, heightMm: 70 },
      { gapMm: 0, outerMarginMm: 80, showGridBorders: false },
    );
    expect(margined.cells).toEqual([]);

    const nanLayout = calculateGridLayout(
      POSTCARD_PAPER,
      { widthMm: Number.NaN, heightMm: 70 },
      { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    );
    expect(nanLayout.cells).toEqual([]);
  });
});
