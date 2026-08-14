import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialDocument,
  DEFAULT_TRANSFORM,
} from '../constants/editor';
import {
  A6_PORTRAIT,
  getPaperPreset,
  L_PORTRAIT,
  PAPER_PRESET_LIST,
  POSTCARD_LANDSCAPE,
  POSTCARD_PORTRAIT,
} from '../constants/paper';
import { buildExportScene } from '../utils/exportPng';
import { calculateGridLayout } from '../utils/gridLayout';
import { reconcileGridCells } from '../utils/reconcileGridCells';
import { collectLiveResourceIds } from '../utils/resourceGc';
import { calculateCellImageLayout } from '../utils/transform';
import { useEditorStore } from './editorStore';

function resetStore() {
  const paper = getPaperPreset(createInitialDocument().paper.paperId);
  const doc = createInitialDocument();
  const layout = calculateGridLayout(paper, doc.photoSize, doc.grid);
  const present = {
    ...doc,
    gridCells: reconcileGridCells([], layout.cells.length).map((cell, i) =>
      i === 0
        ? {
            ...cell,
            resourceId: 'res-a',
            sourceImageId: 'img-a',
            transform: { scale: 1.25, offsetX: 12, offsetY: -4, rotation: 0 as const },
          }
        : cell,
    ),
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

describe('paper preset change', () => {
  beforeEach(() => {
    resetStore();
  });

  it('recalculates grid and keeps row-major leading cells on preset change', () => {
    const before = useEditorStore.getState().history.present.gridCells;
    const firstId = before[0]?.id;
    const firstTransform = before[0]?.transform;

    useEditorStore.getState().setPaper(POSTCARD_LANDSCAPE.id);
    const after = useEditorStore.getState().history.present;
    const landscape = getPaperPreset(after.paper.paperId);
    const layout = calculateGridLayout(
      landscape,
      after.photoSize,
      after.grid,
    );

    expect(after.paper.paperId).toBe(POSTCARD_LANDSCAPE.id);
    expect(after.gridCells.length).toBe(layout.cells.length);
    expect(after.gridCells[0]?.id).toBe(firstId);
    expect(after.gridCells[0]?.transform).toEqual(firstTransform);
    expect(after.gridCells[0]?.resourceId).toBe('res-a');
  });

  it('supports undo/redo of preset change as one history unit', () => {
    const beforeCount =
      useEditorStore.getState().history.present.gridCells.length;
    useEditorStore.getState().setPaper(A6_PORTRAIT.id);
    expect(useEditorStore.getState().history.present.paper.paperId).toBe(
      A6_PORTRAIT.id,
    );

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().history.present.paper.paperId).toBe(
      POSTCARD_PORTRAIT.id,
    );
    expect(
      useEditorStore.getState().history.present.gridCells.length,
    ).toBe(beforeCount);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().history.present.paper.paperId).toBe(
      A6_PORTRAIT.id,
    );
  });

  it('builds export scene at each preset resolution', () => {
    for (const preset of PAPER_PRESET_LIST) {
      useEditorStore.getState().setPaper(preset.id);
      const present = useEditorStore.getState().history.present;
      const scene = buildExportScene(
        present,
        useEditorStore.getState().resources,
        getPaperPreset(present.paper.paperId),
      );
      expect(scene.width).toBe(preset.widthPx);
      expect(scene.height).toBe(preset.heightPx);
      expect(scene.backgroundColor).toBe(present.paper.backgroundColor);
    }
  });

  it('keeps relative transform meaning after cell size changes', () => {
    useEditorStore.getState().setPaper(A6_PORTRAIT.id);
    const present = useEditorStore.getState().history.present;
    const paper = getPaperPreset(present.paper.paperId);
    const layout = calculateGridLayout(paper, present.photoSize, present.grid);
    const cell = present.gridCells[0];
    const layoutCell = layout.cells[0];
    expect(cell?.transform?.scale).toBe(1.25);
    expect(layoutCell).toBeDefined();

    const imageLayout = calculateCellImageLayout(
      200,
      100,
      layoutCell!.x,
      layoutCell!.y,
      layoutCell!.width,
      layoutCell!.height,
      cell!.transform!,
    );
    expect(Number.isFinite(imageLayout.x)).toBe(true);
    expect(Number.isFinite(imageLayout.width)).toBe(true);
    expect(imageLayout.width).toBeGreaterThan(0);
  });

  it('keeps ImageResource alive when preset shrinks grid then undoes', () => {
    useEditorStore.getState().setPaper(L_PORTRAIT.id);
    useEditorStore.getState().setPhotoSize({ widthMm: 200, heightMm: 200 });
    expect(
      useEditorStore.getState().history.present.gridCells.length,
    ).toBe(0);

    expect(
      collectLiveResourceIds(useEditorStore.getState().history).has('res-a'),
    ).toBe(true);
    expect(useEditorStore.getState().resources['res-a']).toBeDefined();

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().resources['res-a']).toBeDefined();
    expect(
      useEditorStore.getState().history.present.gridCells.some(
        (c) => c.resourceId === 'res-a',
      ),
    ).toBe(true);
  });
});
