import { useState } from 'react';
import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { downloadPaperPng } from '../utils/exportPng';
import { PaperCanvas } from './PaperCanvas';
import { SidePanel } from './SidePanel';

export function App() {
  const present = useEditorStore((s) => s.history.present);
  const pastLen = useEditorStore((s) => s.history.past.length);
  const futureLen = useEditorStore((s) => s.history.future.length);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const getComputedLayout = useEditorStore((s) => s.getComputedLayout);
  const commitBackgroundColor = useEditorStore((s) => s.commitBackgroundColor);
  const commitTransform = useEditorStore((s) => s.commitTransform);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isColorDirty = useEditorStore((s) => s.isColorDirty);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const paper = getPaperPreset(present.paper.paperId);
  const layout = getComputedLayout();

  const onDownloadPng = async () => {
    if (exporting) return;
    if (isDirty) commitTransform();
    if (isColorDirty) commitBackgroundColor();

    setExporting(true);
    setExportMessage(null);
    try {
      const latest = useEditorStore.getState();
      const result = await downloadPaperPng(
        latest.history.present,
        latest.resources,
      );
      setExportMessage(
        `PNG 저장: ${result.filename} (${result.width}×${result.height})`,
      );
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : '다운로드에 실패했습니다.';
      setExportMessage(reason);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-toolbar">
        <div className="app-title">
          <strong>Image Maker</strong>
          <span className="app-subtitle">사진 프린트 레이아웃</span>
        </div>

        <div className="toolbar-group">
          <button type="button" onClick={undo} disabled={pastLen === 0}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={futureLen === 0}>
            Redo
          </button>
        </div>

        <div className="toolbar-meta">
          {paper.name} · {paper.widthPx}×{paper.heightPx}px
          {layout.cells.length > 0
            ? ` · ${layout.columns}×${layout.rows} (${layout.cells.length})`
            : ' · 배치 불가'}
        </div>

        <div className="toolbar-group toolbar-export">
          <button
            type="button"
            className="export-btn"
            onClick={onDownloadPng}
            disabled={exporting}
          >
            {exporting ? '내보내는 중…' : 'PNG 다운로드'}
          </button>
        </div>
      </header>

      {exportMessage && (
        <div className="export-banner" role="status">
          {exportMessage}
          <button type="button" onClick={() => setExportMessage(null)}>
            닫기
          </button>
        </div>
      )}

      <div className="app-main">
        <section className="canvas-pane">
          <div className="canvas-pane-inner">
            <PaperCanvas />
            {present.uploadedImages.length === 0 &&
              !present.gridCells.some((c) => c.resourceId) && (
              <p className="canvas-empty-hint">
                오른쪽 [사진]에서 이미지를 업로드한 뒤, 셀에 적용하고 PNG로
                내보내세요.
              </p>
            )}
          </div>
        </section>
        <SidePanel />
      </div>
    </div>
  );
}
