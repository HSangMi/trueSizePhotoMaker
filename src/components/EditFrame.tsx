import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Layer, Rect, Stage } from 'react-konva';
import {
  TRANSFORM_SCALE_MAX,
  TRANSFORM_SCALE_MIN,
} from '../constants/editor';
import { useEditorStore } from '../stores/editorStore';
import type { TransformState } from '../types/editor';
import type { ImageResource } from '../types/image';
import {
  calculateCellImageLayout,
  createWheelZoomGesture,
  screenDeltaToLogical,
} from '../utils/transform';

interface EditFrameProps {
  frameWidth: number;
  frameHeight: number;
  resource: ImageResource;
  transform: TransformState;
  onBeginEdit: () => void;
  onOffsetLive: (offsetX: number, offsetY: number) => void;
  onScaleLive: (scale: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}

/**
 * Clipped edit preview. Uses the same transform math as PaperCanvas.
 * Supports drag pan and debounced wheel zoom.
 */
export function EditFrame({
  frameWidth,
  frameHeight,
  resource,
  transform,
  onBeginEdit,
  onOffsetLive,
  onScaleLive,
  onCommit,
  onCancel,
}: EditFrameProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const pad = 8;
      const availW = Math.max(0, el.clientWidth - pad);
      const availH = Math.max(0, el.clientHeight - pad);
      if (availW <= 0 || availH <= 0 || frameWidth <= 0 || frameHeight <= 0) {
        setPreviewScale(0);
        return;
      }
      setPreviewScale(Math.min(availW / frameWidth, availH / frameHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [frameWidth, frameHeight]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const gesture = createWheelZoomGesture({
      onBegin: onBeginEdit,
      getScale: () =>
        useEditorStore.getState().getActiveTransform()?.scale ??
        transformRef.current.scale,
      onScale: onScaleLive,
      onCommit,
      min: TRANSFORM_SCALE_MIN,
      max: TRANSFORM_SCALE_MAX,
    });

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      gesture.handleWheel(event.deltaY);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      gesture.dispose();
    };
  }, [onBeginEdit, onScaleLive, onCommit]);

  const imageLayout = useMemo(
    () =>
      calculateCellImageLayout(
        resource.width,
        resource.height,
        0,
        0,
        frameWidth,
        frameHeight,
        transform,
      ),
    [resource.width, resource.height, frameWidth, frameHeight, transform],
  );

  const stageW = frameWidth * previewScale;
  const stageH = frameHeight * previewScale;

  const endDrag = (commit: boolean) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (commit) onCommit();
    else onCancel();
  };

  const startDrag = (clientX: number, clientY: number) => {
    onBeginEdit();
    const active = useEditorStore.getState().getActiveTransform();
    dragRef.current = {
      startClientX: clientX,
      startClientY: clientY,
      startOffsetX: active?.offsetX ?? transform.offsetX,
      startOffsetY: active?.offsetY ?? transform.offsetY,
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const screenDx = clientX - drag.startClientX;
    const screenDy = clientY - drag.startClientY;
    onOffsetLive(
      drag.startOffsetX + screenDeltaToLogical(screenDx, previewScale),
      drag.startOffsetY + screenDeltaToLogical(screenDy, previewScale),
    );
  };

  return (
    <div className="edit-frame-viewport" ref={viewportRef}>
      {previewScale > 0 && (
        <Stage
          width={stageW}
          height={stageH}
          scaleX={previewScale}
          scaleY={previewScale}
          style={{ cursor: 'grab', touchAction: 'none' }}
          onMouseDown={(e) => {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            startDrag(pos.x, pos.y);
          }}
          onMouseMove={(e) => {
            if (!dragRef.current) return;
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            moveDrag(pos.x, pos.y);
          }}
          onMouseUp={() => endDrag(true)}
          onMouseLeave={() => {
            if (dragRef.current) endDrag(true);
          }}
          onTouchStart={(e) => {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            startDrag(pos.x, pos.y);
          }}
          onTouchMove={(e) => {
            if (!dragRef.current) return;
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            moveDrag(pos.x, pos.y);
          }}
          onTouchEnd={() => endDrag(true)}
        >
          <Layer>
            <Group
              clipFunc={(ctx) => {
                ctx.rect(0, 0, frameWidth, frameHeight);
              }}
            >
              <Rect width={frameWidth} height={frameHeight} fill="#f0f0f0" />
              <KonvaImage
                image={resource.imageData}
                x={imageLayout.centerX}
                y={imageLayout.centerY}
                offsetX={imageLayout.width / 2}
                offsetY={imageLayout.height / 2}
                width={imageLayout.width}
                height={imageLayout.height}
                rotation={imageLayout.rotation}
                listening={false}
              />
            </Group>
            <Rect
              width={frameWidth}
              height={frameHeight}
              stroke="#555"
              strokeWidth={Math.max(1 / previewScale, 0.5)}
              fillEnabled={false}
              listening={false}
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
}
