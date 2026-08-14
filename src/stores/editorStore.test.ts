import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument, DEFAULT_TRANSFORM } from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { calculateGridLayout } from '../utils/gridLayout';
import { reconcileGridCells } from '../utils/reconcileGridCells';

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

function seedUploaded(imageId: string, resourceId: string) {
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
          {
            id: imageId,
            name: 'a.png',
            resourceId,
            editorTransform: { ...DEFAULT_TRANSFORM, scale: 1.1 },
          },
        ],
      },
    },
  }));
}

describe('editorStore undo/redo', () => {
  beforeEach(() => {
    resetStore();
  });

  it('records history on photo size change and supports undo/redo', () => {
    const initialW =
      useEditorStore.getState().history.present.photoSize.widthMm;

    useEditorStore.getState().setPhotoSize({ widthMm: 40 });
    expect(useEditorStore.getState().history.present.photoSize.widthMm).toBe(
      40,
    );
    expect(useEditorStore.getState().history.past.length).toBe(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().history.present.photoSize.widthMm).toBe(
      initialW,
    );
    expect(useEditorStore.getState().history.future.length).toBe(1);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().history.present.photoSize.widthMm).toBe(
      40,
    );
  });

  it('clears future on new change after undo', () => {
    useEditorStore.getState().setPhotoSize({ widthMm: 40 });
    useEditorStore.getState().setPhotoSize({ widthMm: 30 });
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().history.future.length).toBe(1);

    useEditorStore.getState().setGridSettings({ gapMm: 2 });
    expect(useEditorStore.getState().history.future.length).toBe(0);
  });

  it('reconciles grid cell count when photo size changes', () => {
    const before =
      useEditorStore.getState().history.present.gridCells.length;
    expect(before).toBeGreaterThan(0);

    useEditorStore.getState().setPhotoSize({ widthMm: 200, heightMm: 200 });
    expect(useEditorStore.getState().history.present.gridCells.length).toBe(
      0,
    );

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().history.present.gridCells.length).toBe(
      before,
    );
  });
});

describe('editorStore apply images', () => {
  beforeEach(() => {
    resetStore();
    seedUploaded('img-1', 'res-1');
  });

  it('applies image to a single cell and undoes in one step', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id;
    expect(cellId).toBeTruthy();

    useEditorStore.getState().applyImageToCell(cellId!, 'img-1');
    const cell = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId);
    expect(cell?.resourceId).toBe('res-1');
    expect(cell?.sourceImageId).toBe('img-1');
    expect(cell?.transform?.scale).toBe(1.1);

    useEditorStore.getState().undo();
    const undone = useEditorStore
      .getState()
      .history.present.gridCells.find((c) => c.id === cellId);
    expect(undone?.resourceId).toBeUndefined();
  });

  it('apply all overwrites every cell in one history entry', () => {
    const cells = useEditorStore.getState().history.present.gridCells;
    expect(cells.length).toBeGreaterThan(1);

    useEditorStore.setState((s) => ({
      history: {
        ...s.history,
        present: {
          ...s.history.present,
          gridCells: s.history.present.gridCells.map((c, i) =>
            i === 0
              ? { ...c, resourceId: 'old-res', sourceImageId: 'old' }
              : c,
          ),
        },
      },
    }));

    useEditorStore.getState().applyImageToAllCells('img-1');
    const after = useEditorStore.getState().history.present.gridCells;
    expect(after.every((c) => c.resourceId === 'res-1')).toBe(true);
    expect(after[0].transform).not.toBe(after[1].transform);

    useEditorStore.getState().undo();
    const undone = useEditorStore.getState().history.present.gridCells;
    expect(undone[0].resourceId).toBe('old-res');
    expect(undone.slice(1).every((c) => !c.resourceId)).toBe(true);
  });

  it('apply empty only fills cells without resourceId', () => {
    useEditorStore.setState((s) => ({
      history: {
        ...s.history,
        present: {
          ...s.history.present,
          gridCells: s.history.present.gridCells.map((c, i) =>
            i === 0
              ? { ...c, resourceId: 'keep', sourceImageId: 'keep-src' }
              : c,
          ),
        },
      },
    }));

    useEditorStore.getState().applyImageToEmptyCells('img-1');
    const after = useEditorStore.getState().history.present.gridCells;
    expect(after[0].resourceId).toBe('keep');
    expect(after.slice(1).every((c) => c.resourceId === 'res-1')).toBe(true);
  });

  it('keeps cell selection when applying from upload list click', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().selectGridCell(cellId);
    useEditorStore.getState().onUploadListItemClick('img-1');

    expect(useEditorStore.getState().selectedTarget).toEqual({
      type: 'cell',
      cellId,
    });
    expect(
      useEditorStore.getState().history.present.gridCells[0]?.resourceId,
    ).toBe('res-1');
  });
});
