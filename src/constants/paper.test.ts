import { describe, expect, it } from 'vitest';
import {
  A6_LANDSCAPE,
  A6_PORTRAIT,
  L_LANDSCAPE,
  L_PORTRAIT,
  mmToPaperPx,
  PAPER_PRESET_LIST,
  PAPER_PX_PER_MM,
  POSTCARD_LANDSCAPE,
  POSTCARD_PAPER,
  POSTCARD_PORTRAIT,
  getPaperPreset,
} from './paper';

describe('paper presets', () => {
  it('keeps original postcard calibration (100×148 → 1181×1748)', () => {
    expect(POSTCARD_PORTRAIT.widthMm).toBe(100);
    expect(POSTCARD_PORTRAIT.heightMm).toBe(148);
    expect(POSTCARD_PORTRAIT.widthPx).toBe(1181);
    expect(POSTCARD_PORTRAIT.heightPx).toBe(1748);
    expect(POSTCARD_PAPER).toEqual(POSTCARD_PORTRAIT);
  });

  it('uses shared ~300 DPI px/mm basis for all presets', () => {
    expect(PAPER_PX_PER_MM).toBeCloseTo(11.81, 5);
    for (const preset of PAPER_PRESET_LIST) {
      expect(preset.widthPx).toBe(mmToPaperPx(preset.widthMm));
      expect(preset.heightPx).toBe(mmToPaperPx(preset.heightMm));
      expect(preset.widthMm).toBeGreaterThan(0);
      expect(preset.heightMm).toBeGreaterThan(0);
      expect(preset.widthPx).toBeGreaterThan(0);
      expect(preset.heightPx).toBeGreaterThan(0);
    }
  });

  it('defines expected portrait/landscape sizes', () => {
    expect(POSTCARD_LANDSCAPE).toMatchObject({
      widthMm: 148,
      heightMm: 100,
      widthPx: 1748,
      heightPx: 1181,
    });
    expect(A6_PORTRAIT).toMatchObject({
      widthMm: 105,
      heightMm: 148,
      widthPx: 1240,
      heightPx: 1748,
    });
    expect(A6_LANDSCAPE).toMatchObject({
      widthMm: 148,
      heightMm: 105,
      widthPx: 1748,
      heightPx: 1240,
    });
    expect(L_PORTRAIT).toMatchObject({
      widthMm: 89,
      heightMm: 127,
      widthPx: 1051,
      heightPx: 1500,
    });
    expect(L_LANDSCAPE).toMatchObject({
      widthMm: 127,
      heightMm: 89,
      widthPx: 1500,
      heightPx: 1051,
    });
  });

  it('swaps axes between portrait and landscape pairs', () => {
    expect(POSTCARD_LANDSCAPE.widthMm).toBe(POSTCARD_PORTRAIT.heightMm);
    expect(POSTCARD_LANDSCAPE.heightMm).toBe(POSTCARD_PORTRAIT.widthMm);
    expect(A6_LANDSCAPE.widthPx).toBe(A6_PORTRAIT.heightPx);
    expect(A6_LANDSCAPE.heightPx).toBe(A6_PORTRAIT.widthPx);
  });

  it('resolves legacy postcard id to portrait preset', () => {
    expect(getPaperPreset('postcard').id).toBe(POSTCARD_PORTRAIT.id);
    expect(getPaperPreset('unknown-paper').id).toBe(POSTCARD_PORTRAIT.id);
  });

  it('exposes six selectable presets', () => {
    expect(PAPER_PRESET_LIST).toHaveLength(6);
  });
});
