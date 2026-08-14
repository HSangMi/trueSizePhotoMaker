import {
  DEFAULT_TRANSFORM,
  GRID_BORDER_COLOR,
  GRID_BORDER_WIDTH_PX,
} from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import type {
  DocumentSnapshot,
  PaperPreset,
  RotationDegrees,
} from '../types/editor';
import type { ImageResourceRegistry } from '../types/image';
import {
  buildGridBorderLines,
  type GridBorderLine,
} from './gridBorders';
import { calculateGridLayout } from './gridLayout';
import {
  calculateCellImageLayout,
  normalizeTransform,
} from './transform';

export interface ExportImageDraw {
  imageData: ImageBitmap | HTMLImageElement;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation: RotationDegrees;
}

export interface ExportCellDraw {
  x: number;
  y: number;
  width: number;
  height: number;
  image?: ExportImageDraw;
}

/**
 * Display-scale-independent export scene in Paper px.
 * Does not include selection UI / hit borders.
 */
export interface ExportScene {
  width: number;
  height: number;
  backgroundColor: string;
  cells: ExportCellDraw[];
  /** Print cell borders (empty when option is off). */
  gridBorders: GridBorderLine[];
}

export function buildExportScene(
  present: DocumentSnapshot,
  resources: ImageResourceRegistry,
  paper: PaperPreset = getPaperPreset(present.paper.paperId),
): ExportScene {
  const layout = calculateGridLayout(paper, present.photoSize, present.grid);
  const cells: ExportCellDraw[] = [];

  for (let i = 0; i < present.gridCells.length; i += 1) {
    const docCell = present.gridCells[i];
    const layoutCell = layout.cells[i];
    if (!docCell || !layoutCell) continue;

    const entry: ExportCellDraw = {
      x: layoutCell.x,
      y: layoutCell.y,
      width: layoutCell.width,
      height: layoutCell.height,
    };

    if (docCell.resourceId) {
      const resource = resources[docCell.resourceId];
      if (resource) {
        const transform = normalizeTransform(
          docCell.transform ?? DEFAULT_TRANSFORM,
        );
        const imageLayout = calculateCellImageLayout(
          resource.width,
          resource.height,
          layoutCell.x,
          layoutCell.y,
          layoutCell.width,
          layoutCell.height,
          transform,
        );
        entry.image = {
          imageData: resource.imageData,
          centerX: imageLayout.centerX,
          centerY: imageLayout.centerY,
          width: imageLayout.width,
          height: imageLayout.height,
          rotation: imageLayout.rotation,
        };
      }
    }

    cells.push(entry);
  }

  const showBorders = present.grid.showGridBorders ?? false;
  const gridBorders = showBorders
    ? buildGridBorderLines(
        cells.map((c) => ({
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
        })),
      )
    : [];

  return {
    width: paper.widthPx,
    height: paper.heightPx,
    backgroundColor: present.paper.backgroundColor,
    cells,
    gridBorders,
  };
}

/**
 * Rasterize the export scene onto a canvas at exact Paper px size.
 */
export function renderExportSceneToCanvas(scene: ExportScene): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context를 사용할 수 없습니다.');
  }

  ctx.fillStyle = scene.backgroundColor;
  ctx.fillRect(0, 0, scene.width, scene.height);

  for (const cell of scene.cells) {
    if (!cell.image) continue;
    if (
      !Number.isFinite(cell.image.centerX) ||
      !Number.isFinite(cell.image.centerY) ||
      !Number.isFinite(cell.image.width) ||
      !Number.isFinite(cell.image.height) ||
      cell.image.width <= 0 ||
      cell.image.height <= 0
    ) {
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.width, cell.height);
    ctx.clip();

    ctx.translate(cell.image.centerX, cell.image.centerY);
    if (cell.image.rotation !== 0) {
      ctx.rotate((cell.image.rotation * Math.PI) / 180);
    }
    ctx.drawImage(
      cell.image.imageData,
      -cell.image.width / 2,
      -cell.image.height / 2,
      cell.image.width,
      cell.image.height,
    );
    ctx.restore();
  }

  if (scene.gridBorders.length > 0) {
    ctx.save();
    ctx.strokeStyle = GRID_BORDER_COLOR;
    ctx.lineWidth = GRID_BORDER_WIDTH_PX;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (const line of scene.gridBorders) {
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
    }
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}

export function buildExportFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
  return `photo-print-${stamp}.png`;
}

export async function downloadPaperPng(
  present: DocumentSnapshot,
  resources: ImageResourceRegistry,
): Promise<{ width: number; height: number; filename: string }> {
  const scene = buildExportScene(present, resources);
  const canvas = renderExportSceneToCanvas(scene);
  const filename = buildExportFilename();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) reject(new Error('PNG 생성에 실패했습니다.'));
      else resolve(result);
    }, 'image/png');
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return {
    width: scene.width,
    height: scene.height,
    filename,
  };
}
