export type PaperId = string;

export interface PaperPreset {
  id: PaperId;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

export interface PaperSettings {
  paperId: PaperId;
  /** e.g. #FFFFFF */
  backgroundColor: string;
}

export interface PhotoSizeSettings {
  /** Print photo width in millimeters */
  widthMm: number;
  /** Print photo height in millimeters */
  heightMm: number;
}

export interface GridSettings {
  gapMm: number;
  outerMarginMm: number;
  /**
   * When true, draw print cell borders on PaperCanvas and include them in PNG export.
   * Not a UI selection highlight — logical Paper-px stroke on each cell rect.
   */
  showGridBorders: boolean;
}

/**
 * Cover-relative scale and frame-center offsets (Paper px).
 * scale=1 means "cover the current frame".
 * offset (0,0) means image center == frame center.
 * rotation is clockwise degrees in 90° steps.
 */
export type RotationDegrees = 0 | 90 | 180 | 270;

export interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: RotationDegrees;
}

export type UploadedImageId = string;
export type GridCellId = string;
export type ImageResourceId = string;

export interface UploadedImage {
  id: UploadedImageId;
  name: string;
  resourceId: ImageResourceId;
  /** Transform used when editing the uploaded image itself */
  editorTransform: TransformState;
}

export interface GridCell {
  id: GridCellId;
  /**
   * Reference to an upload-list item.
   * Cleared (undefined) when removed from the upload list only.
   */
  sourceImageId?: UploadedImageId;
  /**
   * Actual pixel resource. May remain after upload-list removal.
   */
  resourceId?: ImageResourceId;
  /** Per-cell independent transform */
  transform?: TransformState;
}

/**
 * Document state stored in history.
 * Does NOT contain ImageResource / imageData.
 */
export interface DocumentSnapshot {
  paper: PaperSettings;
  photoSize: PhotoSizeSettings;
  grid: GridSettings;
  uploadedImages: UploadedImage[];
  gridCells: GridCell[];
}

export interface HistoryState {
  past: DocumentSnapshot[];
  present: DocumentSnapshot;
  future: DocumentSnapshot[];
}

export type SelectedTarget =
  | { type: 'uploaded'; imageId: UploadedImageId }
  | { type: 'cell'; cellId: GridCellId }
  | null;
