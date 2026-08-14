import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import { POSTCARD_PAPER } from '../constants/paper';
import type { DocumentSnapshot } from '../types/editor';
import type { ImageResourceRegistry } from '../types/image';
import {
  buildExportFilename,
  buildExportScene,
} from './exportPng';

function makeDoc(
  overrides: Partial<DocumentSnapshot> = {},
): DocumentSnapshot {
  return {
    paper: { paperId: 'postcard', backgroundColor: '#FFFFFF' },
    photoSize: { widthMm: 50, heightMm: 70 },
    grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
    uploadedImages: [],
    gridCells: [
      {
        id: 'c0',
        resourceId: 'res-1',
        transform: { scale: 1.5, offsetX: 20, offsetY: -10, rotation: 0 },
      },
      { id: 'c1' },
    ],
    ...overrides,
  };
}

describe('exportPng', () => {
  it('builds scene at exact paper pixel size independent of displayScale', () => {
    const scene = buildExportScene(makeDoc(), {}, POSTCARD_PAPER);
    expect(scene.width).toBe(1181);
    expect(scene.height).toBe(1748);
    expect(scene.backgroundColor).toBe('#FFFFFF');
  });

  it('includes cell images with transform and excludes selection metadata', () => {
    const resources: ImageResourceRegistry = {
      'res-1': {
        id: 'res-1',
        imageData: {} as HTMLImageElement,
        width: 200,
        height: 100,
      },
    };

    const scene = buildExportScene(makeDoc(), resources, POSTCARD_PAPER);
    expect(scene.cells.length).toBe(2);
    expect(scene.cells[0]?.image).toBeDefined();
    expect(scene.cells[1]?.image).toBeUndefined();
    expect(scene.gridBorders).toEqual([]);

    // No selection / UI fields on scene
    expect('selected' in scene).toBe(false);
    expect('displayScale' in scene).toBe(false);

    const img = scene.cells[0]!.image!;
    // coverScale for 200x100 into ~590.5x825.7 cell is driven by height
    expect(img.width).toBeGreaterThan(scene.cells[0]!.width);
    expect(img.centerX).not.toBe(scene.cells[0]!.x);
    expect(img.rotation).toBe(0);
  });

  it('adds unique grid border lines when showGridBorders is on', () => {
    const scene = buildExportScene(
      makeDoc({
        grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: true },
      }),
      {},
      POSTCARD_PAPER,
    );
    expect(scene.gridBorders.length).toBeGreaterThan(0);
    expect(scene.gridBorders.length).toBeLessThanOrEqual(scene.cells.length * 4);
  });

  it('uses background color from document', () => {
    const scene = buildExportScene(
      makeDoc({ paper: { paperId: 'postcard', backgroundColor: '#112233' } }),
      {},
      POSTCARD_PAPER,
    );
    expect(scene.backgroundColor).toBe('#112233');
  });

  it('uses DEFAULT_TRANSFORM when cell transform is missing', () => {
    const resources: ImageResourceRegistry = {
      'res-1': {
        id: 'res-1',
        imageData: {} as HTMLImageElement,
        width: 100,
        height: 100,
      },
    };
    const doc = makeDoc({
      gridCells: [{ id: 'c0', resourceId: 'res-1' }],
    });
    const scene = buildExportScene(doc, resources, POSTCARD_PAPER);
    const cell = scene.cells[0]!;
    const img = cell.image!;
    // scale=1 cover of square into portrait cell → width matches cell width when width is limiting? 
    // 100x100 into W x H where H>W → coverScale = H/100, display = H x H, centered
    expect(img.width).toBeCloseTo(cell.height, 5);
    expect(img.height).toBeCloseTo(cell.height, 5);
    void DEFAULT_TRANSFORM;
  });

  it('builds timestamped filename', () => {
    const name = buildExportFilename(new Date(2026, 7, 13, 10, 43, 5));
    expect(name).toBe('photo-print-20260813-104305.png');
  });
});
