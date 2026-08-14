import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument, DEFAULT_TRANSFORM } from '../constants/editor';
import { getPaperPreset, POSTCARD_PAPER } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { buildExportScene } from '../utils/exportPng';
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

describe('rotation edit independence', () => {
  beforeEach(() => {
    resetStore();
  });

  it('rotates uploaded image with undo/redo as one step', () => {
    useEditorStore.getState().selectUploadedImage('img-a');
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ rotation: 90 });
    useEditorStore.getState().commitTransform();

    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.rotation,
    ).toBe(90);

    useEditorStore.getState().undo();
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.rotation,
    ).toBe(0);

    useEditorStore.getState().redo();
    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.rotation,
    ).toBe(90);
  });

  it('keeps uploaded and cell rotations independent', () => {
    const cell0 = useEditorStore.getState().history.present.gridCells[0]!.id;
    const cell1 = useEditorStore.getState().history.present.gridCells[1]!.id;

    useEditorStore.getState().selectUploadedImage('img-a');
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ rotation: 90 });
    useEditorStore.getState().commitTransform();

    useEditorStore.getState().applyImageToCell(cell0, 'img-a');
    useEditorStore.getState().applyImageToCell(cell1, 'img-a');
    expect(
      useEditorStore.getState().history.present.gridCells[0]?.transform
        ?.rotation,
    ).toBe(90);

    useEditorStore.getState().selectGridCell(cell0);
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ rotation: 180 });
    useEditorStore.getState().commitTransform();

    expect(
      useEditorStore.getState().history.present.uploadedImages[0]
        ?.editorTransform.rotation,
    ).toBe(90);
    expect(
      useEditorStore.getState().history.present.gridCells[0]?.transform
        ?.rotation,
    ).toBe(180);
    expect(
      useEditorStore.getState().history.present.gridCells[1]?.transform
        ?.rotation,
    ).toBe(90);
  });

  it('includes rotation in export scene draw ops', () => {
    const cellId =
      useEditorStore.getState().history.present.gridCells[0]!.id;
    useEditorStore.getState().applyImageToCell(cellId, 'img-a');
    useEditorStore.getState().selectGridCell(cellId);
    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ rotation: 90 });
    useEditorStore.getState().commitTransform();

    const scene = buildExportScene(
      useEditorStore.getState().history.present,
      useEditorStore.getState().resources,
      POSTCARD_PAPER,
    );
    expect(scene.cells[0]?.image?.rotation).toBe(90);

    useEditorStore.getState().beginTransformEdit();
    useEditorStore.getState().setTransform({ rotation: 180 });
    useEditorStore.getState().commitTransform();
    const scene180 = buildExportScene(
      useEditorStore.getState().history.present,
      useEditorStore.getState().resources,
      POSTCARD_PAPER,
    );
    expect(scene180.cells[0]?.image?.rotation).toBe(180);
  });
});
