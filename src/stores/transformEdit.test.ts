import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument, DEFAULT_TRANSFORM } from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from './editorStore';
import { calculateGridLayout } from '../utils/gridLayout';
import { reconcileGridCells } from '../utils/reconcileGridCells';

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

describe('transform edit gestures', () => {
  beforeEach(() => {
    resetStore();
  });

  it('setTransform does not push history until commitTransform', () => {
    useEditorStore.getState().selectUploadedImage('img-a');
    const pastBefore = useEditorStore.getState().history.past.length;

    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 1.2 });
    useEditorStore.getState().setTransform({ scale: 1.5 });

    expect(useEditorStore.getState().history.past.length).toBe(pastBefore);
    expect(useEditorStore.getState().isDirty).toBe(true);
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.scale,
    ).toBe(1.5);

    useEditorStore.getState().commitTransform();
    expect(useEditorStore.getState().history.past.length).toBe(pastBefore + 1);
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it('commitTransform supports undo and redo of uploaded editorTransform', () => {
    useEditorStore.getState().selectUploadedImage('img-a');
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 1.5, offsetX: 10 });
    useEditorStore.getState().commitTransform();

    useEditorStore.getState().undo();
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform,
    ).toEqual(DEFAULT_TRANSFORM);

    useEditorStore.getState().redo();
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.scale,
    ).toBe(1.5);
  });

  it('keeps uploaded editorTransform independent from cell transform', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;

    useEditorStore.getState().selectUploadedImage('img-a');
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 1.5 });
    useEditorStore.getState().commitTransform();

    useEditorStore.getState().applyImageToCell(cellId, 'img-a');
    expect(
      useEditorStore.getState().history.present.gridCells[0]?.transform?.scale,
    ).toBe(1.5);

    useEditorStore.getState().selectGridCell(cellId);
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 2 });
    useEditorStore.getState().commitTransform();

    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.scale,
    ).toBe(1.5);
    expect(
      useEditorStore.getState().history.present.gridCells[0]?.transform?.scale,
    ).toBe(2);

    const cell2 = useEditorStore.getState().history.present.gridCells[1]?.id!;
    useEditorStore.getState().applyImageToCell(cell2, 'img-a');
    expect(
      useEditorStore.getState().history.present.gridCells[1]?.transform?.scale,
    ).toBe(1.5);
    expect(
      useEditorStore
        .getState()
        .history.present.gridCells[0]?.transform,
    ).not.toBe(
      useEditorStore.getState().history.present.gridCells[1]?.transform,
    );
  });

  it('cell transform edits do not affect sibling cells', () => {
    const cells = useEditorStore.getState().history.present.gridCells;
    useEditorStore.getState().applyImageToAllCells('img-a');

    useEditorStore.getState().selectGridCell(cells[0]!.id);
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ offsetX: 40, scale: 1.8 });
    useEditorStore.getState().commitTransform();

    const present = useEditorStore.getState().history.present;
    expect(present.gridCells[0]?.transform?.offsetX).toBe(40);
    expect(present.gridCells[1]?.transform?.offsetX).toBe(0);
    expect(present.gridCells[1]?.transform?.scale).toBe(1);
  });

  it('cancelTransform restores baseline without history push', () => {
    useEditorStore.getState().selectUploadedImage('img-a');
    const pastBefore = useEditorStore.getState().history.past.length;

    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 2.5 });
    useEditorStore.getState().cancelTransform();

    expect(useEditorStore.getState().history.past.length).toBe(pastBefore);
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.scale,
    ).toBe(1);
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it('does not push history when committed transform equals baseline', () => {
    useEditorStore.getState().selectUploadedImage('img-a');
    const pastBefore = useEditorStore.getState().history.past.length;

    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 1 });
    useEditorStore.getState().commitTransform();

    expect(useEditorStore.getState().history.past.length).toBe(pastBefore);
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it('commits dirty transform before apply so undo restores baseline first', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]?.id!;
    useEditorStore.getState().applyImageToCell(cellId, 'img-a');

    useEditorStore.getState().selectGridCell(cellId);
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ scale: 2 });
    expect(useEditorStore.getState().isDirty).toBe(true);

    useEditorStore.getState().applyImageToCell(cellId, 'img-a');
    expect(useEditorStore.getState().isDirty).toBe(false);

    // Undo apply → cell still has scale 2 from committed gesture
    useEditorStore.getState().undo();
    expect(
      useEditorStore
        .getState()
        .history.present.gridCells.find((c) => c.id === cellId)?.transform
        ?.scale,
    ).toBe(2);

    // Undo gesture → baseline scale 1
    useEditorStore.getState().undo();
    expect(
      useEditorStore
        .getState()
        .history.present.gridCells.find((c) => c.id === cellId)?.transform
        ?.scale,
    ).toBe(1);
  });
});
