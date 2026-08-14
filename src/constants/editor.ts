import type {
  DocumentSnapshot,
  GridSettings,
  PaperSettings,
  PhotoSizeSettings,
  TransformState,
} from '../types/editor';
import { POSTCARD_PAPER } from './paper';

export const DEFAULT_TRANSFORM: TransformState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export const DEFAULT_BACKGROUND_COLOR = '#FFFFFF';

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  paperId: POSTCARD_PAPER.id,
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
};

/** Default photo size: 5.0cm × 7.0cm (fits postcard with room for multiple cells) */
export const DEFAULT_PHOTO_SIZE: PhotoSizeSettings = {
  widthMm: 50,
  heightMm: 70,
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  gapMm: 0,
  outerMarginMm: 0,
  showGridBorders: false,
};

/** Print grid border stroke in Paper px (preview + PNG). */
export const GRID_BORDER_COLOR = '#000000';
export const GRID_BORDER_WIDTH_PX = 1;

export const MAX_HISTORY = 50;

/** Max photos in the upload list */
export const MAX_UPLOADED_IMAGES = 30;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Prefer MIME + extensions so OS file pickers behave consistently. */
export const ACCEPTED_IMAGE_ACCEPT_ATTR = [
  ...ACCEPTED_IMAGE_MIME_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
].join(',');

/** Floating-point tolerance for layout packing */
export const LAYOUT_EPSILON = 1e-6;

/** Relative scale slider range (1 = cover) */
export const TRANSFORM_SCALE_MIN = 0.1;
export const TRANSFORM_SCALE_MAX = 3;
export const TRANSFORM_SCALE_STEP = 0.01;

export function createInitialDocument(): DocumentSnapshot {
  return {
    paper: { ...DEFAULT_PAPER_SETTINGS },
    photoSize: { ...DEFAULT_PHOTO_SIZE },
    grid: { ...DEFAULT_GRID_SETTINGS },
    uploadedImages: [],
    gridCells: [],
  };
}
