import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Line, Rect, Stage } from 'react-konva';
import {
  GRID_BORDER_COLOR,
  GRID_BORDER_WIDTH_PX,
} from '../constants/editor';
import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { getCellIdsUsingUploadedImage } from '../utils/cellManagement';
import { buildGridBorderLines } from '../utils/gridBorders';
import { calculateGridLayout } from '../utils/gridLayout';
import { GridCellNode } from './GridCellNode';

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

/**
 * Paper canvas: Stage content uses Paper px; only Stage scale uses displayScale.
 */
export function PaperCanvas() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const present = useEditorStore((s) => s.history.present);
  const resources = useEditorStore((s) => s.resources);
  const selectedTarget = useEditorStore((s) => s.selectedTarget);
  const selectGridCell = useEditorStore((s) => s.selectGridCell);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const paper = getPaperPreset(present.paper.paperId);
  const layout = useMemo(
    () => calculateGridLayout(paper, present.photoSize, present.grid),
    [paper, present.photoSize, present.grid],
  );

  const displayScale =
    size.width > 0 && size.height > 0
      ? Math.min(size.width / paper.widthPx, size.height / paper.heightPx)
      : 0;

  const stageWidth = paper.widthPx * displayScale;
  const stageHeight = paper.heightPx * displayScale;
  const strokeWidth =
    displayScale > 0 ? Math.max(1 / displayScale, 0.5) : 1;

  const selectedCellId =
    selectedTarget?.type === 'cell' ? selectedTarget.cellId : null;

  const linkedCellIds = useMemo(() => {
    if (selectedTarget?.type !== 'uploaded') return new Set<string>();
    return new Set(
      getCellIdsUsingUploadedImage(present.gridCells, selectedTarget.imageId),
    );
  }, [selectedTarget, present.gridCells]);

  const showGridBorders = present.grid.showGridBorders ?? false;
  const printBorderLines = useMemo(() => {
    if (!showGridBorders) return [];
    return buildGridBorderLines(
      layout.cells.map((c) => ({
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      })),
    );
  }, [showGridBorders, layout.cells]);

  return (
    <div className="paper-canvas-viewport" ref={ref}>
      {displayScale > 0 && (
        <Stage
          width={stageWidth}
          height={stageHeight}
          scaleX={displayScale}
          scaleY={displayScale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              clearSelection();
            }
          }}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={paper.widthPx}
              height={paper.heightPx}
              fill={present.paper.backgroundColor}
              listening={false}
            />
            {present.gridCells.map((docCell, index) => {
              const layoutCell = layout.cells[index];
              if (!layoutCell) return null;
              const resource = docCell.resourceId
                ? resources[docCell.resourceId]
                : undefined;
              const selected = selectedCellId === docCell.id;
              return (
                <GridCellNode
                  key={`content-${docCell.id}`}
                  docCell={docCell}
                  layoutCell={layoutCell}
                  resource={resource}
                  selected={selected}
                  linked={!selected && linkedCellIds.has(docCell.id)}
                  strokeWidth={strokeWidth}
                  onSelect={selectGridCell}
                  layer="content"
                />
              );
            })}
            {printBorderLines.map((line, i) => (
              <Line
                key={`print-border-${i}`}
                points={[line.x1, line.y1, line.x2, line.y2]}
                stroke={GRID_BORDER_COLOR}
                strokeWidth={GRID_BORDER_WIDTH_PX}
                listening={false}
                perfectDrawEnabled={false}
              />
            ))}
            {present.gridCells.map((docCell, index) => {
              const layoutCell = layout.cells[index];
              if (!layoutCell) return null;
              const resource = docCell.resourceId
                ? resources[docCell.resourceId]
                : undefined;
              const selected = selectedCellId === docCell.id;
              return (
                <GridCellNode
                  key={`ui-${docCell.id}`}
                  docCell={docCell}
                  layoutCell={layoutCell}
                  resource={resource}
                  selected={selected}
                  linked={!selected && linkedCellIds.has(docCell.id)}
                  strokeWidth={strokeWidth}
                  onSelect={selectGridCell}
                  layer="ui"
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
