import type { PaperPreset } from '../types/editor';

/**
 * Pixel density locked to the original postcard calibration:
 * 100mm → 1181px (~300 DPI = 300/25.4 ≈ 11.811 px/mm).
 * All presets derive px via this constant so postcard stays exactly 1181×1748.
 */
export const PAPER_PX_PER_MM = 1181 / 100;

export function mmToPaperPx(mm: number): number {
  return Math.round(mm * PAPER_PX_PER_MM);
}

function createPaperPreset(
  id: string,
  label: string,
  widthMm: number,
  heightMm: number,
): PaperPreset {
  return {
    id,
    name: `${label} — ${widthMm} × ${heightMm} mm`,
    widthMm,
    heightMm,
    widthPx: mmToPaperPx(widthMm),
    heightPx: mmToPaperPx(heightMm),
  };
}

export const POSTCARD_PORTRAIT = createPaperPreset(
  'postcard-portrait',
  '엽서 세로',
  100,
  148,
);

export const POSTCARD_LANDSCAPE = createPaperPreset(
  'postcard-landscape',
  '엽서 가로',
  148,
  100,
);

export const A6_PORTRAIT = createPaperPreset('a6-portrait', 'A6 세로', 105, 148);

export const A6_LANDSCAPE = createPaperPreset(
  'a6-landscape',
  'A6 가로',
  148,
  105,
);

export const L_PORTRAIT = createPaperPreset('l-portrait', 'L판 세로', 89, 127);

export const L_LANDSCAPE = createPaperPreset('l-landscape', 'L판 가로', 127, 89);

/** @deprecated Prefer POSTCARD_PORTRAIT — kept for stable imports */
export const POSTCARD_PAPER = POSTCARD_PORTRAIT;

export const PAPER_PRESET_LIST: PaperPreset[] = [
  POSTCARD_PORTRAIT,
  POSTCARD_LANDSCAPE,
  A6_PORTRAIT,
  A6_LANDSCAPE,
  L_PORTRAIT,
  L_LANDSCAPE,
];

export const PAPER_PRESETS: Record<string, PaperPreset> = Object.fromEntries(
  PAPER_PRESET_LIST.map((preset) => [preset.id, preset]),
);

/** Legacy id used before Step 7 */
PAPER_PRESETS.postcard = POSTCARD_PORTRAIT;

export function getPaperPreset(paperId: string): PaperPreset {
  return PAPER_PRESETS[paperId] ?? POSTCARD_PORTRAIT;
}

export function formatPaperOptionLabel(preset: PaperPreset): string {
  return preset.name;
}
