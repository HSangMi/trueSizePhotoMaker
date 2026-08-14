import type { RotationDegrees, TransformState } from '../types/editor';

/**
 * Cover scale: the uniform scale that makes the image fully cover the frame.
 * Image may extend past the frame on one axis.
 */
export function calculateCoverScale(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return 1;
  }
  return Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
}

export function normalizeRotation(value: unknown): RotationDegrees {
  if (value === 90 || value === 180 || value === 270 || value === 0) {
    return value;
  }
  return 0;
}

/**
 * Fill missing fields (e.g. legacy transforms without rotation).
 */
export function normalizeTransform(
  transform: Partial<TransformState> | null | undefined,
): TransformState {
  return {
    scale:
      typeof transform?.scale === 'number' && Number.isFinite(transform.scale)
        ? transform.scale
        : 1,
    offsetX:
      typeof transform?.offsetX === 'number' && Number.isFinite(transform.offsetX)
        ? transform.offsetX
        : 0,
    offsetY:
      typeof transform?.offsetY === 'number' && Number.isFinite(transform.offsetY)
        ? transform.offsetY
        : 0,
    rotation: normalizeRotation(transform?.rotation),
  };
}

export function rotateRight90(rotation: RotationDegrees): RotationDegrees {
  const next = (normalizeRotation(rotation) + 90) % 360;
  return next as RotationDegrees;
}

export function rotateLeft90(rotation: RotationDegrees): RotationDegrees {
  const next = (normalizeRotation(rotation) + 270) % 360;
  return next as RotationDegrees;
}

/**
 * Dimensions used for cover fitting after rotation.
 * 90/270 swap width and height.
 */
export function getEffectiveImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  rotation: RotationDegrees,
): { width: number; height: number } {
  const r = normalizeRotation(rotation);
  if (r === 90 || r === 270) {
    return { width: naturalHeight, height: naturalWidth };
  }
  return { width: naturalWidth, height: naturalHeight };
}

/**
 * actualScale = coverScale(effective) * transform.scale
 */
export function calculateActualScale(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
  transformScale: number,
  rotation: RotationDegrees = 0,
): number {
  const effective = getEffectiveImageDimensions(
    naturalWidth,
    naturalHeight,
    rotation,
  );
  return (
    calculateCoverScale(
      effective.width,
      effective.height,
      frameWidth,
      frameHeight,
    ) * transformScale
  );
}

/**
 * Draw origin (top-left) for an unrotated image centered in a frame with offsets.
 */
export function calculateImageDrawOrigin(
  displayWidth: number,
  displayHeight: number,
  frameWidth: number,
  frameHeight: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  const imageCenterX = frameWidth / 2 + offsetX;
  const imageCenterY = frameHeight / 2 + offsetY;
  return {
    x: imageCenterX - displayWidth / 2,
    y: imageCenterY - displayHeight / 2,
  };
}

export interface CellImageLayout {
  /** Unrotated AABB top-left (absolute paper coords) */
  x: number;
  y: number;
  /** Unrotated draw size (natural * actualScale) */
  width: number;
  height: number;
  /** Image center in absolute paper coords (rotation pivot) */
  centerX: number;
  centerY: number;
  rotation: RotationDegrees;
}

/**
 * Absolute Paper-px layout for an image inside a grid cell / edit frame.
 * Cover uses rotation-aware effective dimensions; draw size uses natural axes
 * before applying rotation around center.
 */
export function calculateCellImageLayout(
  naturalWidth: number,
  naturalHeight: number,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  transformInput: Partial<TransformState>,
): CellImageLayout {
  const transform = normalizeTransform(transformInput);
  const actualScale = calculateActualScale(
    naturalWidth,
    naturalHeight,
    cellWidth,
    cellHeight,
    transform.scale,
    transform.rotation,
  );
  const width = naturalWidth * actualScale;
  const height = naturalHeight * actualScale;
  const centerX = cellX + cellWidth / 2 + transform.offsetX;
  const centerY = cellY + cellHeight / 2 + transform.offsetY;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
    rotation: transform.rotation,
  };
}

/**
 * Convert a screen-pixel drag delta into frame-logical px.
 * previewScale is display-only and must not be stored in TransformState.
 */
export function screenDeltaToLogical(
  screenDelta: number,
  previewScale: number,
): number {
  if (previewScale <= 0) return 0;
  return screenDelta / previewScale;
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Wheel delta → next scale (frame-center zoom; offset unchanged). */
export function nextScaleFromWheel(
  currentScale: number,
  deltaY: number,
  min: number,
  max: number,
  step = 0.05,
): number {
  const direction = deltaY < 0 ? 1 : deltaY > 0 ? -1 : 0;
  return clamp(currentScale + direction * step, min, max);
}

export const WHEEL_ZOOM_DEBOUNCE_MS = 200;

/**
 * Debounced wheel-zoom gesture helper (one begin + many updates + one commit).
 */
export function createWheelZoomGesture(options: {
  debounceMs?: number;
  onBegin: () => void;
  getScale: () => number;
  onScale: (scale: number) => void;
  onCommit: () => void;
  min: number;
  max: number;
  step?: number;
}) {
  const debounceMs = options.debounceMs ?? WHEEL_ZOOM_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    handleWheel(deltaY: number) {
      if (!active) {
        options.onBegin();
        active = true;
      }
      const next = nextScaleFromWheel(
        options.getScale(),
        deltaY,
        options.min,
        options.max,
        options.step,
      );
      options.onScale(next);
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        if (active) {
          options.onCommit();
          active = false;
        }
      }, debounceMs);
    },
    dispose() {
      clearTimer();
      if (active) {
        options.onCommit();
        active = false;
      }
    },
    isActive() {
      return active;
    },
  };
}
