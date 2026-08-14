import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  MAX_UPLOADED_IMAGES,
} from '../constants/editor';
import { useEditorStore } from '../stores/editorStore';
import {
  countUploadedImageUsage,
  formatUsageLabel,
} from '../utils/cellManagement';
import { takeFilesFromFileInput } from '../utils/fileInput';
import { ResourceThumbnail } from './ResourceThumbnail';

/**
 * Photo section body (upload / list / apply). Used inside the accordion.
 */
export function PhotoPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadedImages = useEditorStore((s) => s.history.present.uploadedImages);
  const gridCells = useEditorStore((s) => s.history.present.gridCells);
  const resources = useEditorStore((s) => s.resources);
  const selectedTarget = useEditorStore((s) => s.selectedTarget);
  const addUploadedImages = useEditorStore((s) => s.addUploadedImages);
  const removeFromUploadList = useEditorStore((s) => s.removeFromUploadList);
  const onUploadListItemClick = useEditorStore((s) => s.onUploadListItemClick);
  const applyImageToAllCells = useEditorStore((s) => s.applyImageToAllCells);
  const applyImageToEmptyCells = useEditorStore((s) => s.applyImageToEmptyCells);
  const exitCellEdit = useEditorStore((s) => s.exitCellEdit);

  const selectedUploadedId =
    selectedTarget?.type === 'uploaded' ? selectedTarget.imageId : null;
  const isCellEditing = selectedTarget?.type === 'cell';
  const canApply =
    selectedTarget?.type === 'uploaded' && Boolean(selectedTarget.imageId);

  const onPickFiles = () => {
    inputRef.current?.click();
  };

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = takeFilesFromFileInput(event.currentTarget);
    if (files.length === 0) return;

    setBusy(true);
    setMessage(null);
    try {
      const result = await addUploadedImages(files);
      const notes: string[] = [];

      if (result.skippedLimit > 0) {
        notes.push('사진은 최대 30장까지 업로드할 수 있습니다.');
      }
      if (result.failed.length > 0) {
        const detail = result.failed
          .slice(0, 3)
          .map((f) => `${f.name}: ${f.reason}`)
          .join(' / ');
        notes.push(
          result.failed.length > 3
            ? `${detail} 외 ${result.failed.length - 3}건 실패`
            : detail,
        );
      }
      if (result.added > 0) {
        notes.unshift(`${result.added}장 추가됨`);
      } else if (notes.length === 0) {
        notes.push('선택한 사진을 불러올 수 없습니다.');
      }

      setMessage(notes.join(' · '));
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : '선택한 사진을 불러올 수 없습니다.';
      setMessage(reason);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (event: MouseEvent, imageId: string) => {
    event.stopPropagation();
    const usage = countUploadedImageUsage(gridCells, imageId);
    if (usage > 0) {
      const ok = window.confirm(
        `이 사진은 현재 ${usage}개의 셀에 사용되고 있습니다.\n\n사진 목록에서 삭제해도 이미 배치된 사진은 유지됩니다.\n\n사진 목록에서 삭제할까요?`,
      );
      if (!ok) return;
    }
    removeFromUploadList(imageId);
  };

  return (
    <div className="photo-section">
      <div className="photo-panel-header">
        <div className="photo-panel-count">
          {uploadedImages.length} / {MAX_UPLOADED_IMAGES}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        multiple
        hidden
        onChange={onFilesSelected}
      />

      <button
        type="button"
        className="photo-add-btn"
        onClick={onPickFiles}
        disabled={busy || uploadedImages.length >= MAX_UPLOADED_IMAGES}
      >
        {busy ? '업로드 중…' : '사진 추가'}
      </button>

      {uploadedImages.length === 0 && !busy && (
        <p className="photo-panel-empty-hint">
          사진 섹션에서 이미지를 업로드하세요. (최대 {MAX_UPLOADED_IMAGES}장)
        </p>
      )}

      <div className="photo-actions">
        <button
          type="button"
          disabled={!canApply}
          title={
            canApply
              ? undefined
              : '업로드 사진을 선택한 뒤 사용할 수 있습니다.'
          }
          onClick={() => {
            if (selectedUploadedId) applyImageToAllCells(selectedUploadedId);
          }}
        >
          전체 적용
        </button>
        <button
          type="button"
          disabled={!canApply}
          title={
            canApply
              ? undefined
              : '업로드 사진을 선택한 뒤 사용할 수 있습니다.'
          }
          onClick={() => {
            if (selectedUploadedId) applyImageToEmptyCells(selectedUploadedId);
          }}
        >
          빈칸 적용
        </button>
        {isCellEditing && (
          <button type="button" onClick={exitCellEdit}>
            셀 편집 종료
          </button>
        )}
      </div>

      {isCellEditing && (
        <p className="photo-panel-hint">
          셀 편집 중 — 목록의 사진을 클릭하면 현재 선택된 셀에만 적용됩니다.
        </p>
      )}

      {!isCellEditing && selectedUploadedId && (
        <p className="photo-panel-hint photo-panel-hint-soft">
          사진 선택됨 — 캔버스의 셀을 클릭해 개별 편집하거나, 전체/빈칸 적용을
          사용하세요.
        </p>
      )}

      {message && <p className="photo-panel-message">{message}</p>}

      <ul className="photo-list">
        {uploadedImages.length === 0 && (
          <li className="photo-list-empty">업로드된 사진이 없습니다.</li>
        )}
        {uploadedImages.map((img) => {
          const resource = resources[img.resourceId];
          const selected = selectedUploadedId === img.id;
          const usage = countUploadedImageUsage(gridCells, img.id);
          return (
            <li
              key={img.id}
              className={
                selected
                  ? 'photo-list-item photo-list-item-selected'
                  : 'photo-list-item'
              }
              onClick={() => onUploadListItemClick(img.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUploadListItemClick(img.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {resource ? (
                <ResourceThumbnail resource={resource} />
              ) : (
                <div className="photo-thumb photo-thumb-missing" />
              )}
              <div className="photo-list-meta">
                <div className="photo-list-name" title={img.name}>
                  {img.name}
                </div>
                <div className="photo-list-usage">{formatUsageLabel(usage)}</div>
                <button
                  type="button"
                  className="photo-delete-btn"
                  onClick={(e) => onDelete(e, img.id)}
                >
                  삭제
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
