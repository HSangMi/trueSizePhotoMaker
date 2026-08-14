import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument, DEFAULT_TRANSFORM } from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { collectLiveResourceIds } from '../utils/resourceGc';
import { calculateGridLayout } from '../utils/gridLayout';
import { reconcileGridCells } from '../utils/reconcileGridCells';
import { buildExportScene } from '../utils/exportPng';

function resetStore() {
  const paper = getPaperPreset(createInitialDocument().paper.paperId);
  const doc = createInitialDocument();
  const layout = calculateGridLayout(paper, doc.photoSize, doc.grid);
  const present = {
    ...doc,
    gridCells: reconcileGridCells([], layout.cells.length),
  };

  useEditorStore.setState({
    resources: {},
    history: { past: [], present, future: [] },
    selectedTarget: null,
    isDirty: false,
    transformBaseline: null,
    isColorDirty: false,
    colorBaseline: null,
  });
}

function seedUploaded(
  imageId: string,
  resourceId: string,
  name = 'a.png',
) {
  useEditorStore.setState((s) => ({
    resources: {
      ...s.resources,
      [resourceId]: {
        id: resourceId,
        imageData: {} as HTMLImageElement,
        width: 100,
        height: 100,
      },
    },
    history: {
      ...s.history,
      present: {
        ...s.history.present,
        uploadedImages: [
          ...s.history.present.uploadedImages.filter((u) => u.id !== imageId),
          {
            id: imageId,
            name,
            resourceId,
            editorTransform: {
              ...DEFAULT_TRANSFORM,
              scale: 1.25,
              offsetX: 5,
              offsetY: -3,
              rotation: 90,
            },
          },
        ],
      },
    },
  }));
}

describe('cell clear / photo management', () => {
  beforeEach(() => {
    resetStore();
    seedUploaded('img-1', 'res-1', 'IMG_1234.jpg');
  });

  it('clears cell image fields and restores them on undo/redo', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().applyImageToCell(cellId, 'img-1');
    useEditorStore.getState().selectGridCell(cellId);

    const applied = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId)!;
    expect(applied.resourceId).toBe('res-1');
    expect(applied.sourceImageId).toBe('img-1');
    expect(applied.transform?.rotation).toBe(90);

    useEditorStore.getState().clearGridCell(cellId);
    const cleared = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId)!;
    expect(cleared.resourceId).toBeUndefined();
    expect(cleared.sourceImageId).toBeUndefined();
    expect(cleared.transform).toBeUndefined();
    expect(useEditorStore.getState().selectedTarget).toEqual({
      type: 'cell',
      cellId,
    });

    useEditorStore.getState().undo();
    const restored = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId)!;
    expect(restored.resourceId).toBe('res-1');
    expect(restored.sourceImageId).toBe('img-1');
    expect(restored.transform?.scale).toBe(1.25);
    expect(restored.transform?.offsetX).toBe(5);
    expect(restored.transform?.offsetY).toBe(-3);
    expect(restored.transform?.rotation).toBe(90);

    useEditorStore.getState().redo();
    const reCleared = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId)!;
    expect(reCleared.resourceId).toBeUndefined();
  });

  it('allows empty-cell apply after clear', () => {
    const cells = useEditorStore.getState().history.present.gridCells;
    const cellA = cells[0]!.id;
    const cellB = cells[1]!.id;

    useEditorStore.getState().applyImageToAllCells('img-1');
    useEditorStore.getState().clearGridCell(cellA);

    useEditorStore.getState().applyImageToEmptyCells('img-1');
    const next = useEditorStore.getState().history.present.gridCells;
    expect(next.find((c) => c.id === cellA)?.resourceId).toBe('res-1');
    expect(next.find((c) => c.id === cellB)?.resourceId).toBe('res-1');
  });

  it('keeps cell resource after upload-list delete and restores sourceImageId on undo', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().applyImageToCell(cellId, 'img-1');
    useEditorStore.getState().removeFromUploadList('img-1');

    const present = useEditorStore.getState().history.present;
    expect(present.uploadedImages.find((u) => u.id === 'img-1')).toBeUndefined();
    const cell = present.gridCells.find((c) => c.id === cellId)!;
    expect(cell.resourceId).toBe('res-1');
    expect(cell.sourceImageId).toBeUndefined();
    expect(useEditorStore.getState().resources['res-1']).toBeDefined();

    const cellIndex = present.gridCells.findIndex((c) => c.id === cellId);
    const paper = getPaperPreset(present.paper.paperId);
    const scene = buildExportScene(
      present,
      useEditorStore.getState().resources,
      paper,
    );
    expect(scene.cells[cellIndex]?.image).toBeDefined();
    expect(useEditorStore.getState().resources['res-1']).toBeDefined();

    useEditorStore.getState().undo();
    const undone = useEditorStore.getState().history.present;
    expect(undone.uploadedImages.some((u) => u.id === 'img-1')).toBe(true);
    expect(
      undone.gridCells.find((c) => c.id === cellId)?.sourceImageId,
    ).toBe('img-1');
  });

  it('GCs resource only when upload + all cells + history no longer reference it', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().applyImageToCell(cellId, 'img-1');
    useEditorStore.getState().removeFromUploadList('img-1');
    useEditorStore.getState().clearGridCell(cellId);

    // Still live via history.past
    expect(
      collectLiveResourceIds(useEditorStore.getState().history).has('res-1'),
    ).toBe(true);
    expect(useEditorStore.getState().resources['res-1']).toBeDefined();

    // Collapse history so nothing references res-1
    const present = useEditorStore.getState().history.present;
    useEditorStore.setState({
      history: { past: [], present, future: [] },
    });
    useEditorStore.getState().gcOrphanResources();

    expect(useEditorStore.getState().resources['res-1']).toBeUndefined();
    expect(
      collectLiveResourceIds(useEditorStore.getState().history).has('res-1'),
    ).toBe(false);
  });
});
