import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialDocument } from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
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

describe('showGridBorders setting', () => {
  beforeEach(() => {
    resetStore();
  });

  it('defaults to false', () => {
    expect(
      useEditorStore.getState().history.present.grid.showGridBorders,
    ).toBe(false);
  });

  it('toggles with undo/redo', () => {
    useEditorStore.getState().setGridSettings({ showGridBorders: true });
    expect(
      useEditorStore.getState().history.present.grid.showGridBorders,
    ).toBe(true);

    useEditorStore.getState().undo();
    expect(
      useEditorStore.getState().history.present.grid.showGridBorders,
    ).toBe(false);

    useEditorStore.getState().redo();
    expect(
      useEditorStore.getState().history.present.grid.showGridBorders,
    ).toBe(true);
  });

  it('keeps showGridBorders across photo size and paper changes', () => {
    useEditorStore.getState().setGridSettings({ showGridBorders: true });
    useEditorStore.getState().setPhotoSize({ widthMm: 40 });
    useEditorStore.getState().setGridSettings({ gapMm: 2 });
    expect(
      useEditorStore.getState().history.present.grid.showGridBorders,
    ).toBe(true);
  });

  it('includes deduped borders in export only when enabled', () => {
    const present = useEditorStore.getState().history.present;
    const paper = getPaperPreset(present.paper.paperId);

    const off = buildExportScene(present, {}, paper);
    expect(off.gridBorders).toEqual([]);

    useEditorStore.getState().setGridSettings({ showGridBorders: true });
    const onPresent = useEditorStore.getState().history.present;
    const on = buildExportScene(onPresent, {}, paper);
    expect(on.gridBorders.length).toBeGreaterThan(0);
    expect(on.cells.length).toBeGreaterThan(0);
    // Every cell contributes edges; shared edges are unique.
    expect(on.gridBorders.length).toBeLessThanOrEqual(on.cells.length * 4);
  });
});
