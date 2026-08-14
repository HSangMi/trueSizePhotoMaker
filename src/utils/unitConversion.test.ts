import { describe, expect, it } from 'vitest';
import { POSTCARD_PAPER } from '../constants/paper';
import {
  cmToMm,
  mmToCm,
  mmToPxX,
  mmToPxY,
  pxToMmX,
  pxToMmY,
} from '../utils/unitConversion';

describe('unitConversion', () => {
  it('converts cm ↔ mm', () => {
    expect(cmToMm(5)).toBe(50);
    expect(mmToCm(50)).toBe(5);
    expect(cmToMm(0.1)).toBe(1);
  });

  it('converts mm → px on postcard axes independently', () => {
    expect(mmToPxX(100, POSTCARD_PAPER)).toBeCloseTo(1181, 5);
    expect(mmToPxY(148, POSTCARD_PAPER)).toBeCloseTo(1748, 5);
    expect(mmToPxX(50, POSTCARD_PAPER)).toBeCloseTo(590.5, 5);
    expect(mmToPxY(70, POSTCARD_PAPER)).toBeCloseTo(
      70 * (1748 / 148),
      5,
    );
  });

  it('round-trips px ↔ mm', () => {
    const x = mmToPxX(33.3, POSTCARD_PAPER);
    const y = mmToPxY(44.4, POSTCARD_PAPER);
    expect(pxToMmX(x, POSTCARD_PAPER)).toBeCloseTo(33.3, 10);
    expect(pxToMmY(y, POSTCARD_PAPER)).toBeCloseTo(44.4, 10);
  });
});
