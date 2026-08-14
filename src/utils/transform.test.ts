import { describe, expect, it, vi } from 'vitest';
import {
  calculateActualScale,
  calculateCellImageLayout,
  calculateCoverScale,
  createWheelZoomGesture,
  getEffectiveImageDimensions,
  nextScaleFromWheel,
  normalizeTransform,
  rotateLeft90,
  rotateRight90,
  screenDeltaToLogical,
} from './transform';

describe('transform helpers', () => {
  it('calculates cover scale to fill frame', () => {
    expect(calculateCoverScale(200, 100, 100, 100)).toBe(1);
    expect(calculateCoverScale(100, 100, 200, 100)).toBe(2);
  });

  it('multiplies cover by relative transform.scale', () => {
    expect(calculateActualScale(100, 100, 200, 100, 0.5)).toBe(1);
    expect(calculateActualScale(100, 100, 200, 100, 2)).toBe(4);
  });

  it('centers cover image in cell when transform is default', () => {
    const layout = calculateCellImageLayout(
      200,
      100,
      10,
      20,
      100,
      100,
      { scale: 1, offsetX: 0, offsetY: 0 },
    );

    expect(layout.width).toBe(200);
    expect(layout.height).toBe(100);
    expect(layout.x).toBe(10 + 50 - 100);
    expect(layout.y).toBe(20 + 50 - 50);
    expect(layout.rotation).toBe(0);
  });

  it('applies offset from cell center', () => {
    const layout = calculateCellImageLayout(
      100,
      100,
      0,
      0,
      100,
      100,
      { scale: 1, offsetX: 5, offsetY: -8 },
    );
    expect(layout.x).toBe(5);
    expect(layout.y).toBe(-8);
  });

  it('converts screen drag delta to logical px via previewScale', () => {
    expect(screenDeltaToLogical(50, 0.5)).toBe(100);
    expect(screenDeltaToLogical(30, 1)).toBe(30);
    expect(screenDeltaToLogical(10, 0)).toBe(0);
  });
});

describe('rotation helpers', () => {
  it('defaults missing rotation to 0', () => {
    expect(normalizeTransform({ scale: 1.2, offsetX: 1, offsetY: 2 })).toEqual({
      scale: 1.2,
      offsetX: 1,
      offsetY: 2,
      rotation: 0,
    });
  });

  it('rotates right 0→90→180→270→0', () => {
    expect(rotateRight90(0)).toBe(90);
    expect(rotateRight90(90)).toBe(180);
    expect(rotateRight90(180)).toBe(270);
    expect(rotateRight90(270)).toBe(0);
  });

  it('rotates left 0→270→180→90→0', () => {
    expect(rotateLeft90(0)).toBe(270);
    expect(rotateLeft90(90)).toBe(0);
    expect(rotateLeft90(180)).toBe(90);
    expect(rotateLeft90(270)).toBe(180);
  });

  it('swaps effective dimensions for 90/270', () => {
    expect(getEffectiveImageDimensions(200, 100, 0)).toEqual({
      width: 200,
      height: 100,
    });
    expect(getEffectiveImageDimensions(200, 100, 180)).toEqual({
      width: 200,
      height: 100,
    });
    expect(getEffectiveImageDimensions(200, 100, 90)).toEqual({
      width: 100,
      height: 200,
    });
    expect(getEffectiveImageDimensions(200, 100, 270)).toEqual({
      width: 100,
      height: 200,
    });
  });

  it('changes coverScale when rotating tall image into wide frame', () => {
    // 100x200 image into 200x100 frame
    const cover0 = calculateCoverScale(100, 200, 200, 100);
    const cover90 = calculateActualScale(100, 200, 200, 100, 1, 90);
    // without rotation: max(200/100, 100/200) = 2
    expect(cover0).toBe(2);
    // with 90° effective 200x100: max(200/200, 100/100) = 1
    expect(cover90).toBe(1);
  });
});

describe('wheel zoom gesture', () => {
  it('clamps scale from wheel delta', () => {
    expect(nextScaleFromWheel(1, -100, 0.1, 3, 0.05)).toBeCloseTo(1.05);
    expect(nextScaleFromWheel(1, 100, 0.1, 3, 0.05)).toBeCloseTo(0.95);
    expect(nextScaleFromWheel(2.99, -100, 0.1, 3, 0.05)).toBe(3);
    expect(nextScaleFromWheel(0.11, 100, 0.1, 3, 0.05)).toBe(0.1);
  });

  it('commits once after debounced wheel burst', () => {
    vi.useFakeTimers();
    const onBegin = vi.fn();
    const onScale = vi.fn();
    const onCommit = vi.fn();
    let scale = 1;

    const gesture = createWheelZoomGesture({
      debounceMs: 200,
      onBegin,
      getScale: () => scale,
      onScale: (s) => {
        scale = s;
        onScale(s);
      },
      onCommit,
      min: 0.1,
      max: 3,
      step: 0.05,
    });

    gesture.handleWheel(-100);
    gesture.handleWheel(-100);
    gesture.handleWheel(-100);
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(scale).toBeCloseTo(1.15);

    vi.advanceTimersByTime(200);
    expect(onCommit).toHaveBeenCalledTimes(1);

    gesture.dispose();
    vi.useRealTimers();
  });

  it('commits pending gesture on dispose', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const gesture = createWheelZoomGesture({
      debounceMs: 200,
      onBegin: () => undefined,
      getScale: () => 1,
      onScale: () => undefined,
      onCommit,
      min: 0.1,
      max: 3,
    });
    gesture.handleWheel(-10);
    gesture.dispose();
    expect(onCommit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
