import { create } from 'zustand';
import {
  createInitialDocument,
  DEFAULT_TRANSFORM,
  MAX_HISTORY,
  MAX_UPLOADED_IMAGES,
} from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import type {
  DocumentSnapshot,
  GridCellId,
  GridSettings,
  HistoryState,
  ImageResourceId,
  PaperId,
  PhotoSizeSettings,
  SelectedTarget,
  TransformState,
  UploadedImageId,
} from '../types/editor';
import type { ImageResource, ImageResourceRegistry } from '../types/image';
import { decodeImageFilesForUpload } from '../utils/decodeImage';
import {
  applyImageToAllCells as applyAll,
  applyImageToEmptyCells as applyEmpty,
  assignImageToCell,
  findUploadedImage,
} from '../utils/applyImage';
import { clearCellImage, isCellEmpty } from '../utils/cellManagement';
import { calculateGridLayout } from '../utils/gridLayout';
import { createSnapshot, documentsEqual } from '../utils/history';
import { reconcileGridCells as reconcileCells } from '../utils/reconcileGridCells';
import { pruneOrphanResources } from '../utils/resourceGc';
import { mmToPxX, mmToPxY } from '../utils/unitConversion';
import { normalizeTransform } from '../utils/transform';

export interface AddUploadedImagesResult {
  added: number;
  skippedLimit: number;
  failed: { name: string; reason: string }[];
}

export interface EditorStore {
  resources: ImageResourceRegistry;
  history: HistoryState;
  selectedTarget: SelectedTarget;
  /** True while an in-progress transform gesture has uncommitted changes */
  isDirty: boolean;
  /** Snapshot before the current transform gesture (for commit) */
  transformBaseline: DocumentSnapshot | null;
  /** True while background color picker gesture is active */
  isColorDirty: boolean;
  /** Background color before the current color gesture */
  colorBaseline: string | null;

  getPresent: () => DocumentSnapshot;
  getResource: (id: ImageResourceId) => ImageResource | undefined;
  getActiveTransform: () => TransformState | null;
  getActiveFrameSize: () => { width: number; height: number } | null;
  getComputedLayout: () => ReturnType<typeof calculateGridLayout>;

  registerResource: (resource: ImageResource) => void;
  gcOrphanResources: () => void;

  selectUploadedImage: (imageId: UploadedImageId) => void;
  selectGridCell: (cellId: GridCellId) => void;
  exitCellEdit: () => void;
  clearSelection: () => void;
  onUploadListItemClick: (imageId: UploadedImageId) => void;

  setPaper: (paperId: PaperId) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundColorLive: (color: string) => void;
  commitBackgroundColor: () => void;
  setPhotoSize: (size: Partial<PhotoSizeSettings>) => void;
  setGridSettings: (settings: Partial<GridSettings>) => void;

  reconcileGridCells: () => void;

  addUploadedImages: (files: File[]) => Promise<AddUploadedImagesResult>;
  removeFromUploadList: (imageId: UploadedImageId) => void;
  applyImageToCell: (cellId: GridCellId, imageId: UploadedImageId) => void;
  applyImageToAllCells: (imageId: UploadedImageId) => void;
  applyImageToEmptyCells: (imageId: UploadedImageId) => void;
  /** Remove image + transform from a cell (History). Selection is kept. */
  clearGridCell: (cellId: GridCellId) => void;

  /**
   * Start a new transform gesture. Commits any in-progress dirty edit first
   * so overlapping gestures do not share / overwrite baselines incorrectly.
   */
  beginTransformEdit: () => void;
  setTransform: (partial: Partial<TransformState>) => void;
  commitTransform: () => void;
  /** Discard in-progress transform edits (restore baseline). */
  cancelTransform: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (next: DocumentSnapshot) => void;
}

function withReconciledCells(doc: DocumentSnapshot): DocumentSnapshot {
  const paper = getPaperPreset(doc.paper.paperId);
  const layout = calculateGridLayout(paper, doc.photoSize, doc.grid);
  const gridCells = reconcileCells(doc.gridCells, layout.cells.length);
  return { ...doc, gridCells };
}

function createInitialHistory(): HistoryState {
  const present = withReconciledCells(createInitialDocument());
  return {
    past: [],
    present,
    future: [],
  };
}

function sanitizeSelectedTarget(
  selected: SelectedTarget,
  present: DocumentSnapshot,
): SelectedTarget {
  if (!selected) return null;

  if (selected.type === 'uploaded') {
    const exists = present.uploadedImages.some((i) => i.id === selected.imageId);
    return exists ? selected : null;
  }

  const exists = present.gridCells.some((c) => c.id === selected.cellId);
  return exists ? selected : null;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  resources: {},
  history: createInitialHistory(),
  selectedTarget: null,
  isDirty: false,
  transformBaseline: null,
  isColorDirty: false,
  colorBaseline: null,

  getPresent: () => get().history.present,

  getResource: (id) => get().resources[id],

  getActiveTransform: () => {
    const { selectedTarget, history } = get();
    if (!selectedTarget) return null;

    if (selectedTarget.type === 'uploaded') {
      const img = history.present.uploadedImages.find(
        (i) => i.id === selectedTarget.imageId,
      );
      return img ? normalizeTransform(img.editorTransform) : null;
    }

    const cell = history.present.gridCells.find(
      (c) => c.id === selectedTarget.cellId,
    );
    if (!cell) return null;
    return cell.transform
      ? normalizeTransform(cell.transform)
      : { ...DEFAULT_TRANSFORM };
  },

  getActiveFrameSize: () => {
    const { selectedTarget, history } = get();
    if (!selectedTarget) return null;

    const paper = getPaperPreset(history.present.paper.paperId);

    if (selectedTarget.type === 'uploaded') {
      return {
        width: mmToPxX(history.present.photoSize.widthMm, paper),
        height: mmToPxY(history.present.photoSize.heightMm, paper),
      };
    }

    const layout = calculateGridLayout(
      paper,
      history.present.photoSize,
      history.present.grid,
    );
    const cellIndex = history.present.gridCells.findIndex(
      (c) => c.id === selectedTarget.cellId,
    );
    if (cellIndex < 0 || cellIndex >= layout.cells.length) return null;
    const computed = layout.cells[cellIndex];
    return { width: computed.width, height: computed.height };
  },

  getComputedLayout: () => {
    const present = get().history.present;
    const paper = getPaperPreset(present.paper.paperId);
    return calculateGridLayout(paper, present.photoSize, present.grid);
  },

  registerResource: (resource) => {
    set((state) => ({
      resources: { ...state.resources, [resource.id]: resource },
    }));
  },

  gcOrphanResources: () => {
    set((state) => ({
      resources: pruneOrphanResources(state.resources, state.history),
    }));
  },

  selectUploadedImage: (imageId) => {
    if (get().isDirty) get().commitTransform();
    set({
      selectedTarget: { type: 'uploaded', imageId },
      isDirty: false,
      transformBaseline: null,
    });
  },

  selectGridCell: (cellId) => {
    if (get().isDirty) get().commitTransform();
    set({
      selectedTarget: { type: 'cell', cellId },
      isDirty: false,
      transformBaseline: null,
    });
  },

  exitCellEdit: () => {
    if (get().isDirty) get().commitTransform();
    set({ selectedTarget: null, isDirty: false, transformBaseline: null });
  },

  clearSelection: () => {
    if (get().isDirty) get().commitTransform();
    set({ selectedTarget: null, isDirty: false, transformBaseline: null });
  },

  onUploadListItemClick: (imageId) => {
    const { selectedTarget } = get();
    if (selectedTarget?.type === 'cell') {
      get().applyImageToCell(selectedTarget.cellId, imageId);
      return;
    }
    get().selectUploadedImage(imageId);
  },

  setPaper: (paperId) => {
    const present = get().history.present;
    const nextId = getPaperPreset(paperId).id;
    if (getPaperPreset(present.paper.paperId).id === nextId) {
      return;
    }
    const next = withReconciledCells({
      ...createSnapshot(present),
      paper: { ...present.paper, paperId: nextId },
    });
    get().pushHistory(next);
  },

  setBackgroundColor: (color) => {
    if (get().isColorDirty) {
      get().commitBackgroundColor();
    }
    const present = get().history.present;
    if (present.paper.backgroundColor.toUpperCase() === color.toUpperCase()) {
      return;
    }
    const next = createSnapshot(present);
    next.paper.backgroundColor = color;
    get().pushHistory(next);
  },

  setBackgroundColorLive: (color) => {
    const { history, isColorDirty, colorBaseline } = get();
    const baseline =
      isColorDirty && colorBaseline !== null
        ? colorBaseline
        : history.present.paper.backgroundColor;

    const present = createSnapshot(history.present);
    present.paper.backgroundColor = color;

    set({
      history: { ...history, present },
      isColorDirty: true,
      colorBaseline: baseline,
    });
  },

  commitBackgroundColor: () => {
    const { isColorDirty, colorBaseline, history } = get();
    if (!isColorDirty || colorBaseline === null) {
      set({ isColorDirty: false, colorBaseline: null });
      return;
    }

    if (
      colorBaseline.toUpperCase() ===
      history.present.paper.backgroundColor.toUpperCase()
    ) {
      set({ isColorDirty: false, colorBaseline: null });
      return;
    }

    const baselineDoc = createSnapshot(history.present);
    baselineDoc.paper.backgroundColor = colorBaseline;

    set({
      history: {
        past: [...history.past, baselineDoc].slice(-MAX_HISTORY),
        present: createSnapshot(history.present),
        future: [],
      },
      isColorDirty: false,
      colorBaseline: null,
    });
  },

  setPhotoSize: (size) => {
    const present = get().history.present;
    const nextSize = { ...present.photoSize, ...size };
    if (
      !Number.isFinite(nextSize.widthMm) ||
      !Number.isFinite(nextSize.heightMm) ||
      nextSize.widthMm <= 0 ||
      nextSize.heightMm <= 0
    ) {
      return;
    }
    const next = withReconciledCells({
      ...createSnapshot(present),
      photoSize: nextSize,
    });
    get().pushHistory(next);
  },

  setGridSettings: (settings) => {
    const present = get().history.present;
    const nextGrid = { ...present.grid, ...settings };
    if (
      !Number.isFinite(nextGrid.gapMm) ||
      !Number.isFinite(nextGrid.outerMarginMm) ||
      nextGrid.gapMm < 0 ||
      nextGrid.outerMarginMm < 0
    ) {
      return;
    }
    const next = withReconciledCells({
      ...createSnapshot(present),
      grid: nextGrid,
    });
    get().pushHistory(next);
  },

  reconcileGridCells: () => {
    const present = get().history.present;
    const next = withReconciledCells(createSnapshot(present));
    get().pushHistory(next);
  },

  addUploadedImages: async (files) => {
    const present = get().history.present;
    const remaining = MAX_UPLOADED_IMAGES - present.uploadedImages.length;
    const batch = await decodeImageFilesForUpload(files, remaining);

    if (batch.resources.length > 0) {
      set((state) => {
        const resources = { ...state.resources };
        for (const resource of batch.resources) {
          resources[resource.id] = resource;
        }
        return { resources };
      });

      const next = createSnapshot(present);
      next.uploadedImages = [
        ...next.uploadedImages,
        ...batch.uploadedImages,
      ];
      get().pushHistory(next);
    }

    return {
      added: batch.uploadedImages.length,
      skippedLimit: batch.skippedLimit,
      failed: batch.failed,
    };
  },

  removeFromUploadList: (imageId) => {
    const present = get().history.present;
    const next = createSnapshot(present);
    next.uploadedImages = next.uploadedImages.filter((i) => i.id !== imageId);
    next.gridCells = next.gridCells.map((cell) => {
      if (cell.sourceImageId === imageId) {
        return { ...cell, sourceImageId: undefined };
      }
      return cell;
    });
    get().pushHistory(next);

    const { selectedTarget } = get();
    if (
      selectedTarget?.type === 'uploaded' &&
      selectedTarget.imageId === imageId
    ) {
      set({ selectedTarget: null });
    }
  },

  applyImageToCell: (cellId, imageId) => {
    const present = get().history.present;
    const uploaded = findUploadedImage(present.uploadedImages, imageId);
    if (!uploaded) return;

    const next = createSnapshot(present);
    next.gridCells = next.gridCells.map((cell) => {
      if (cell.id !== cellId) return cell;
      return assignImageToCell(cell, uploaded);
    });
    get().pushHistory(next);
  },

  applyImageToAllCells: (imageId) => {
    const present = get().history.present;
    const uploaded = findUploadedImage(present.uploadedImages, imageId);
    if (!uploaded) return;

    const next = createSnapshot(present);
    next.gridCells = applyAll(next.gridCells, uploaded);
    get().pushHistory(next);
  },

  applyImageToEmptyCells: (imageId) => {
    const present = get().history.present;
    const uploaded = findUploadedImage(present.uploadedImages, imageId);
    if (!uploaded) return;

    const next = createSnapshot(present);
    next.gridCells = applyEmpty(next.gridCells, uploaded);
    get().pushHistory(next);
  },

  clearGridCell: (cellId) => {
    const present = get().history.present;
    const cell = present.gridCells.find((c) => c.id === cellId);
    if (!cell) return;
    if (
      isCellEmpty(cell) &&
      cell.sourceImageId === undefined &&
      cell.transform === undefined
    ) {
      return;
    }

    if (get().isDirty) {
      get().commitTransform();
    }

    const next = createSnapshot(present);
    next.gridCells = next.gridCells.map((c) =>
      c.id === cellId ? clearCellImage(c) : c,
    );
    get().pushHistory(next);
  },

  beginTransformEdit: () => {
    if (get().isDirty) {
      get().commitTransform();
    }
  },

  setTransform: (partial) => {
    const { selectedTarget, history, isDirty, transformBaseline } = get();
    if (!selectedTarget) return;

    const baseline =
      isDirty && transformBaseline
        ? transformBaseline
        : createSnapshot(history.present);

    const working = createSnapshot(history.present);

    if (selectedTarget.type === 'uploaded') {
      working.uploadedImages = working.uploadedImages.map((img) => {
        if (img.id !== selectedTarget.imageId) return img;
        return {
          ...img,
          editorTransform: normalizeTransform({
            ...img.editorTransform,
            ...partial,
          }),
        };
      });
    } else {
      working.gridCells = working.gridCells.map((cell) => {
        if (cell.id !== selectedTarget.cellId) return cell;
        const current = cell.transform ?? { ...DEFAULT_TRANSFORM };
        return {
          ...cell,
          transform: normalizeTransform({ ...current, ...partial }),
        };
      });
    }

    set({
      history: { ...history, present: working },
      isDirty: true,
      transformBaseline: baseline,
    });
  },

  commitTransform: () => {
    const { isDirty, transformBaseline, history } = get();
    if (!isDirty || !transformBaseline) {
      set({ isDirty: false, transformBaseline: null });
      return;
    }

    // Same as background-color commit: ignore no-op gestures (e.g. wheel at clamp).
    if (documentsEqual(transformBaseline, history.present)) {
      set({ isDirty: false, transformBaseline: null });
      return;
    }

    const past = [...history.past, createSnapshot(transformBaseline)].slice(
      -MAX_HISTORY,
    );

    set({
      history: {
        past,
        present: createSnapshot(history.present),
        future: [],
      },
      isDirty: false,
      transformBaseline: null,
    });
  },

  cancelTransform: () => {
    const { isDirty, transformBaseline, history } = get();
    if (!isDirty || !transformBaseline) {
      set({ isDirty: false, transformBaseline: null });
      return;
    }

    set({
      history: {
        ...history,
        present: createSnapshot(transformBaseline),
      },
      isDirty: false,
      transformBaseline: null,
    });
  },

  undo: () => {
    const { history, isDirty } = get();
    if (isDirty) {
      // Discard in-progress gesture first
      const { transformBaseline } = get();
      if (transformBaseline) {
        set({
          history: { ...history, present: createSnapshot(transformBaseline) },
          isDirty: false,
          transformBaseline: null,
        });
        return;
      }
    }

    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const present = createSnapshot(previous);

    set({
      history: {
        past: newPast,
        present,
        future: [createSnapshot(history.present), ...history.future],
      },
      selectedTarget: sanitizeSelectedTarget(get().selectedTarget, present),
      isDirty: false,
      transformBaseline: null,
    });
  },

  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const present = createSnapshot(next);

    set({
      history: {
        past: [...history.past, createSnapshot(history.present)].slice(
          -MAX_HISTORY,
        ),
        present,
        future: newFuture,
      },
      selectedTarget: sanitizeSelectedTarget(get().selectedTarget, present),
      isDirty: false,
      transformBaseline: null,
    });
  },

  pushHistory: (next) => {
    // Commit in-progress transform first so Undo can restore baseline → gesture → next.
    if (get().isDirty) {
      get().commitTransform();
    }
    if (get().isColorDirty) {
      get().commitBackgroundColor();
    }

    const { history, selectedTarget } = get();
    const past = [...history.past, createSnapshot(history.present)].slice(
      -MAX_HISTORY,
    );
    const present = createSnapshot(next);

    set({
      history: {
        past,
        present,
        future: [],
      },
      selectedTarget: sanitizeSelectedTarget(selectedTarget, present),
      isDirty: false,
      transformBaseline: null,
      isColorDirty: false,
      colorBaseline: null,
    });

    // Discarded future branches may leave orphans; keep undo/redo-live ids.
    get().gcOrphanResources();
  },
}));
