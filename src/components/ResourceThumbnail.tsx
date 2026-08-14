import { useEffect, useRef } from 'react';
import type { ImageResource } from '../types/image';

/**
 * Draws ImageBitmap / HTMLImageElement into a fixed-size canvas thumbnail.
 * Does not put image bytes into DocumentSnapshot.
 */
export function ResourceThumbnail({
  resource,
  size = 64,
}: {
  resource: ImageResource;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, size, size);

    const { width, height, imageData } = resource;
    if (width <= 0 || height <= 0) return;

    const scale = Math.min(size / width, size / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;
    ctx.drawImage(imageData, dx, dy, dw, dh);
  }, [resource, size]);

  return (
    <canvas
      ref={canvasRef}
      className="photo-thumb"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
