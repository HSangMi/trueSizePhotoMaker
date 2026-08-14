import {
  ACCEPTED_IMAGE_MIME_TYPES,
  DEFAULT_TRANSFORM,
} from '../constants/editor';
import type { ImageResourceId, UploadedImage } from '../types/editor';
import type { ImageResource } from '../types/image';

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export function isAcceptedImageFile(file: File): boolean {
  if ((ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  // Some OS/browser combos (notably Windows) report an empty MIME for valid images.
  if (!file.type) {
    return /\.(jpe?g|png|webp)$/i.test(file.name);
  }
  return false;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function decodeViaImageElement(
  file: File,
): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
      img.src = objectUrl;
    });
    return { image, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Decode a File into an ImageResource (createImageBitmap preferred).
 */
export async function decodeImageFile(file: File): Promise<ImageResource> {
  if (!isAcceptedImageFile(file)) {
    throw new Error('지원하지 않는 이미지 형식입니다.');
  }

  const id: ImageResourceId = createId('res');

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        id,
        imageData: bitmap,
        width: bitmap.width,
        height: bitmap.height,
      };
    } catch {
      // fall through to HTMLImageElement
    }
  }

  const { image, objectUrl } = await decodeViaImageElement(file);
  return {
    id,
    imageData: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    objectUrl,
  };
}

export function createUploadedImage(
  name: string,
  resourceId: ImageResourceId,
): UploadedImage {
  return {
    id: createId('img'),
    name,
    resourceId,
    editorTransform: { ...DEFAULT_TRANSFORM },
  };
}

export interface DecodeBatchResult {
  resources: ImageResource[];
  uploadedImages: UploadedImage[];
  failed: { name: string; reason: string }[];
  skippedLimit: number;
}

/**
 * Decode up to `remainingSlots` accepted image files.
 * Invalid / failed files are reported without aborting the batch.
 */
export async function decodeImageFilesForUpload(
  files: File[],
  remainingSlots: number,
): Promise<DecodeBatchResult> {
  const resources: ImageResource[] = [];
  const uploadedImages: UploadedImage[] = [];
  const failed: { name: string; reason: string }[] = [];

  const accepted: File[] = [];
  for (const file of files) {
    if (!isAcceptedImageFile(file)) {
      failed.push({
        name: file.name,
        reason: '지원하지 않는 이미지 형식입니다.',
      });
      continue;
    }
    accepted.push(file);
  }

  const toProcess = accepted.slice(0, Math.max(0, remainingSlots));
  const skippedLimit = Math.max(0, accepted.length - toProcess.length);

  for (const file of toProcess) {
    try {
      const resource = await decodeImageFile(file);
      resources.push(resource);
      uploadedImages.push(createUploadedImage(file.name, resource.id));
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : '이미지 디코딩에 실패했습니다.';
      failed.push({ name: file.name, reason });
    }
  }

  return { resources, uploadedImages, failed, skippedLimit };
}
