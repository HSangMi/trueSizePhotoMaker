import { useCallback } from 'react';
import {
  TRANSFORM_SCALE_MAX,
  TRANSFORM_SCALE_MIN,
  TRANSFORM_SCALE_STEP,
} from '../constants/editor';
import { useEditorStore } from '../stores/editorStore';
import type { TransformState } from '../types/editor';
import type { ImageResource } from '../types/image';
import {
  resolveCellPhotoStatus,
  type CellPhotoStatus,
} from '../utils/cellManagement';
import {
  clamp,
  normalizeTransform,
  rotateLeft90,
  rotateRight90,
} from '../utils/transform';
import { EditFrame } from './EditFrame';
import { ResourceThumbnail } from './ResourceThumbnail';
import { TransformSlider } from './TransformSlider';

type ActiveEditContext =
  | {
      mode: 'uploaded';
      title: string;
      frame: { width: number; height: number };
      transform: TransformState;
      resource: ImageResource;
    }
  | {
      mode: 'cell';
      cellId: string;
      title: string;
      frame: { width: number; height: number };
      status: CellPhotoStatus;
      transform: TransformState | null;
      resource: ImageResource | undefined;
    };

function useActiveEditContext(): ActiveEditContext | null {
  const selectedTarget = useEditorStore((s) => s.selectedTarget);
  const present = useEditorStore((s) => s.history.present);
  const resources = useEditorStore((s) => s.resources);
  const getActiveTransform = useEditorStore((s) => s.getActiveTransform);
  const getActiveFrameSize = useEditorStore((s) => s.getActiveFrameSize);

  if (!selectedTarget) {
    return null;
  }

  const frame = getActiveFrameSize();
  if (!frame) return null;

  if (selectedTarget.type === 'uploaded') {
    const img = present.uploadedImages.find(
      (i) => i.id === selectedTarget.imageId,
    );
    if (!img) return null;
    const transform = getActiveTransform();
    if (!transform) return null;
    const resource = resources[img.resourceId];
    if (!resource) return null;
    return {
      mode: 'uploaded',
      title: `업로드 사진 편집 — ${img.name}`,
      frame,
      transform: normalizeTransform(transform),
      resource,
    };
  }

  const cell = present.gridCells.find((c) => c.id === selectedTarget.cellId);
  if (!cell) return null;

  const status = resolveCellPhotoStatus(cell, present.uploadedImages);
  const resource =
    status.kind === 'empty' || !cell.resourceId
      ? undefined
      : resources[cell.resourceId];
  const transform =
    status.kind === 'empty' || !resource
      ? null
      : normalizeTransform(
          getActiveTransform() ?? {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
          },
        );

  return {
    mode: 'cell',
    cellId: cell.id,
    title: '셀 사진 편집',
    frame,
    status,
    transform,
    resource,
  };
}

export function EditPanel() {
  const ctx = useActiveEditContext();
  const beginTransformEdit = useEditorStore((s) => s.beginTransformEdit);
  const setTransform = useEditorStore((s) => s.setTransform);
  const commitTransform = useEditorStore((s) => s.commitTransform);
  const cancelTransform = useEditorStore((s) => s.cancelTransform);
  const clearGridCell = useEditorStore((s) => s.clearGridCell);

  const onBegin = useCallback(() => {
    beginTransformEdit();
  }, [beginTransformEdit]);

  const onCommit = useCallback(() => {
    commitTransform();
  }, [commitTransform]);

  const onCancel = useCallback(() => {
    cancelTransform();
  }, [cancelTransform]);

  const rotateBy = useCallback(
    (direction: 'left' | 'right') => {
      const active = useEditorStore.getState().getActiveTransform();
      if (!active) return;
      const current = normalizeTransform(active);
      const next =
        direction === 'left'
          ? rotateLeft90(current.rotation)
          : rotateRight90(current.rotation);
      beginTransformEdit();
      setTransform({ rotation: next });
      commitTransform();
    },
    [beginTransformEdit, setTransform, commitTransform],
  );

  if (!ctx) {
    return (
      <section className="edit-panel">
        <h3>사진 편집</h3>
        <p className="edit-panel-empty">
          편집할 사진 또는 셀을 선택하세요.
        </p>
      </section>
    );
  }

  if (ctx.mode === 'cell' && ctx.status.kind === 'empty') {
    return (
      <section className="edit-panel">
        <h3>{ctx.title}</h3>
        <p className="edit-panel-meta">
          프레임 {ctx.frame.width.toFixed(0)}×{ctx.frame.height.toFixed(0)} px
          {' '}
          (GridCell)
        </p>
        <div className="cell-photo-info">
          <div className="cell-photo-info-text">
            <div className="cell-photo-info-label">현재 셀</div>
            <div className="cell-photo-info-name">
              사진이 적용되지 않았습니다.
            </div>
          </div>
        </div>
        <p className="edit-panel-empty">
          사진을 선택하면 현재 선택된 셀에 적용됩니다.
        </p>
      </section>
    );
  }

  const { frame, transform, resource, title } = ctx;
  if (!transform || !resource) {
    return (
      <section className="edit-panel">
        <h3>{title}</h3>
        <p className="edit-panel-empty">이미지 리소스를 찾을 수 없습니다.</p>
      </section>
    );
  }

  const offsetXMax = Math.max(frame.width, 1);
  const offsetYMax = Math.max(frame.height, 1);
  const photoLabel =
    ctx.mode === 'cell' && ctx.status.kind !== 'empty'
      ? ctx.status.name
      : null;
  const isOrphan = ctx.mode === 'cell' && ctx.status.kind === 'orphan';

  return (
    <section className="edit-panel">
      <h3>{title}</h3>
      <p className="edit-panel-meta">
        프레임 {frame.width.toFixed(0)}×{frame.height.toFixed(0)} px
        {ctx.mode === 'uploaded' ? ' (PhotoSize)' : ' (GridCell)'}
      </p>

      {ctx.mode === 'cell' && photoLabel && (
        <div className="cell-photo-info">
          <ResourceThumbnail resource={resource} size={48} />
          <div className="cell-photo-info-text">
            <div className="cell-photo-info-label">현재 셀</div>
            <div className="cell-photo-info-name" title={photoLabel}>
              {photoLabel}
            </div>
            {isOrphan && (
              <div className="cell-photo-info-orphan">
                현재 셀 사진이 업로드 목록에 없습니다.
              </div>
            )}
          </div>
          <button
            type="button"
            className="cell-clear-btn"
            onClick={() => clearGridCell(ctx.cellId)}
          >
            셀 비우기
          </button>
        </div>
      )}

      <EditFrame
        frameWidth={frame.width}
        frameHeight={frame.height}
        resource={resource}
        transform={transform}
        onBeginEdit={onBegin}
        onOffsetLive={(offsetX, offsetY) => {
          setTransform({ offsetX, offsetY });
        }}
        onScaleLive={(scale) => {
          setTransform({ scale });
        }}
        onCommit={onCommit}
        onCancel={onCancel}
      />

      <div className="rotation-controls">
        <span className="rotation-label">회전: {transform.rotation}°</span>
        <div className="rotation-buttons">
          <button
            type="button"
            title="왼쪽으로 90°"
            onClick={() => rotateBy('left')}
          >
            ↺
          </button>
          <button
            type="button"
            title="오른쪽으로 90°"
            onClick={() => rotateBy('right')}
          >
            ↻
          </button>
        </div>
      </div>

      <div className="transform-controls">
        <TransformSlider
          label="Zoom"
          min={TRANSFORM_SCALE_MIN}
          max={TRANSFORM_SCALE_MAX}
          step={TRANSFORM_SCALE_STEP}
          value={transform.scale}
          displayValue={`${transform.scale.toFixed(2)}×`}
          onBegin={onBegin}
          onLiveChange={(scale) => setTransform({ scale })}
          onCommit={onCommit}
        />
        <TransformSlider
          label="X"
          min={-offsetXMax}
          max={offsetXMax}
          step={1}
          value={clamp(transform.offsetX, -offsetXMax, offsetXMax)}
          displayValue={`${Math.round(transform.offsetX)} px`}
          onBegin={onBegin}
          onLiveChange={(offsetX) => setTransform({ offsetX })}
          onCommit={onCommit}
        />
        <TransformSlider
          label="Y"
          min={-offsetYMax}
          max={offsetYMax}
          step={1}
          value={clamp(transform.offsetY, -offsetYMax, offsetYMax)}
          displayValue={`${Math.round(transform.offsetY)} px`}
          onBegin={onBegin}
          onLiveChange={(offsetY) => setTransform({ offsetY })}
          onCommit={onCommit}
        />
      </div>
    </section>
  );
}
