import type { ImageResourceId } from './editor';

export interface ImageResource {
  id: ImageResourceId;
  /**
   * Runtime image handle. Not deep-copied into history.
   */
  imageData: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  /**
   * Optional object URL used for HTMLImageElement decode / thumbnails.
   * Revoked when the resource is GC'd.
   */
  objectUrl?: string;
}

export type ImageResourceRegistry = Record<ImageResourceId, ImageResource>;
