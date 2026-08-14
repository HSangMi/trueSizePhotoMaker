import type { PaperPreset } from '../types/editor';

export function cmToMm(cm: number): number {
  return cm * 10;
}

export function mmToCm(mm: number): number {
  return mm / 10;
}

export function mmToPxX(mm: number, paper: PaperPreset): number {
  return mm * (paper.widthPx / paper.widthMm);
}

export function mmToPxY(mm: number, paper: PaperPreset): number {
  return mm * (paper.heightPx / paper.heightMm);
}

export function pxToMmX(px: number, paper: PaperPreset): number {
  return px * (paper.widthMm / paper.widthPx);
}

export function pxToMmY(px: number, paper: PaperPreset): number {
  return px * (paper.heightMm / paper.heightPx);
}
