import type { KonvaEventObject } from 'konva/lib/Node';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import { DEFAULT_TRANSFORM } from '../constants/editor';
import type { GridCell } from '../types/editor';
import type { ComputedGridCell } from '../types/grid';
import type { ImageResource } from '../types/image';
import {
  calculateCellImageLayout,
  normalizeTransform,
} from '../utils/transform';

interface GridCellNodeProps {
  docCell: GridCell;
  layoutCell: ComputedGridCell;
  resource: ImageResource | undefined;
  selected: boolean;
  /** Weak highlight: selected UploadedImage is applied here (UI-only). */
  linked: boolean;
  strokeWidth: number;
  onSelect: (cellId: string) => void;
  /**
   * `content` = image/empty only; `ui` = hit + selection stroke only;
   * `all` = both (default).
   */
  layer?: 'content' | 'ui' | 'all';
}

export function GridCellNode({
  docCell,
  layoutCell,
  resource,
  selected,
  linked,
  strokeWidth,
  onSelect,
  layer = 'all',
}: GridCellNodeProps) {
  const { x, y, width, height } = layoutCell;
  const transform = normalizeTransform(docCell.transform ?? DEFAULT_TRANSFORM);

  const imageLayout =
    resource &&
    calculateCellImageLayout(
      resource.width,
      resource.height,
      x,
      y,
      width,
      height,
      transform,
    );

  const handleSelect = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect(docCell.id);
  };

  let stroke = '#8a8a8a';
  let strokeW = strokeWidth;
  if (selected) {
    stroke = '#1d4ed8';
    strokeW = strokeWidth * 2.5;
  } else if (linked) {
    stroke = '#93c5fd';
    strokeW = strokeWidth * 1.75;
  }

  const empty = !resource;
  const labelSize = Math.min(width, height) * 0.12;
  const showContent = layer === 'all' || layer === 'content';
  const showUi = layer === 'all' || layer === 'ui';

  return (
    <>
      {showContent && (
        <Group
          x={x}
          y={y}
          clipFunc={(ctx) => {
            ctx.rect(0, 0, width, height);
          }}
          listening={false}
        >
          <Rect
            width={width}
            height={height}
            fill={empty ? 'rgba(0, 0, 0, 0.04)' : '#ffffff'}
          />
          {empty && labelSize >= 8 && (
            <Text
              text="Empty"
              width={width}
              height={height}
              align="center"
              verticalAlign="middle"
              fontSize={labelSize}
              fill="#b0b0b0"
              listening={false}
            />
          )}
          {resource && imageLayout && (
            <KonvaImage
              image={resource.imageData}
              x={imageLayout.centerX - x}
              y={imageLayout.centerY - y}
              offsetX={imageLayout.width / 2}
              offsetY={imageLayout.height / 2}
              width={imageLayout.width}
              height={imageLayout.height}
              rotation={imageLayout.rotation}
            />
          )}
        </Group>
      )}

      {showUi && (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          stroke={stroke}
          strokeWidth={strokeW}
          onClick={handleSelect}
          onTap={handleSelect}
        />
      )}
    </>
  );
}
