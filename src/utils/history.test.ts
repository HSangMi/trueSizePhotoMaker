import { describe, expect, it } from 'vitest';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import type { DocumentSnapshot } from '../types/editor';
import { createSnapshot, documentsEqual } from './history';

describe('createSnapshot', () => {
  it('structurally clones document without sharing nested objects', () => {
    const doc: DocumentSnapshot = {
      paper: { paperId: 'postcard', backgroundColor: '#FFFFFF' },
      photoSize: { widthMm: 50, heightMm: 70 },
      grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
      uploadedImages: [
        {
          id: 'u1',
          name: 'a.png',
          resourceId: 'res1',
          editorTransform: { ...DEFAULT_TRANSFORM },
        },
      ],
      gridCells: [
        {
          id: 'c1',
          resourceId: 'res1',
          transform: { scale: 1.2, offsetX: 3, offsetY: -4, rotation: 0 },
        },
      ],
    };

    const snap = createSnapshot(doc);
    expect(snap.paper).toEqual(doc.paper);
    expect(snap.photoSize).toEqual(doc.photoSize);
    expect(snap.grid).toEqual(doc.grid);
    expect(snap.uploadedImages).toEqual(doc.uploadedImages);
    expect(snap.gridCells[0]?.transform).toEqual(doc.gridCells[0]?.transform);
    expect(snap).not.toBe(doc);
    expect(snap.uploadedImages[0]).not.toBe(doc.uploadedImages[0]);
    expect(snap.uploadedImages[0].editorTransform).not.toBe(
      doc.uploadedImages[0].editorTransform,
    );
    expect(snap.gridCells[0].transform).not.toBe(doc.gridCells[0].transform);
  });
});

describe('documentsEqual', () => {
  it('detects identical and divergent snapshots', () => {
    const doc: DocumentSnapshot = {
      paper: { paperId: 'postcard', backgroundColor: '#FFFFFF' },
      photoSize: { widthMm: 50, heightMm: 70 },
      grid: { gapMm: 0, outerMarginMm: 0, showGridBorders: false },
      uploadedImages: [],
      gridCells: [{ id: 'c1' }],
    };
    expect(documentsEqual(createSnapshot(doc), createSnapshot(doc))).toBe(true);
    const changed = createSnapshot(doc);
    changed.gridCells[0] = {
      id: 'c1',
      transform: { ...DEFAULT_TRANSFORM, scale: 2 },
    };
    expect(documentsEqual(createSnapshot(doc), changed)).toBe(false);
  });
});
