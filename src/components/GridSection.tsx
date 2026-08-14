import { getPaperPreset } from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';
import { cmToMm, mmToCm, pxToMmX, pxToMmY } from '../utils/unitConversion';
import { CommitNumberInput } from './CommitNumberInput';

function formatMm(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function formatCm(mm: number): string {
  return Number(mmToCm(mm).toFixed(1)).toString();
}

export function GridSection() {
  const present = useEditorStore((s) => s.history.present);
  const setPhotoSize = useEditorStore((s) => s.setPhotoSize);
  const setGridSettings = useEditorStore((s) => s.setGridSettings);
  const getComputedLayout = useEditorStore((s) => s.getComputedLayout);

  const layout = getComputedLayout();
  const paper = getPaperPreset(present.paper.paperId);
  const canPlace = layout.cells.length > 0;

  const remainXMm = canPlace
    ? pxToMmX(paper.widthPx - layout.usedWidth, paper)
    : 0;
  const remainYMm = canPlace
    ? pxToMmY(paper.heightPx - layout.usedHeight, paper)
    : 0;

  const photoW = present.photoSize.widthMm;
  const photoH = present.photoSize.heightMm;

  return (
    <div className="section-stack">
      <h4 className="section-subtitle">사진 크기</h4>
      <CommitNumberInput
        label="가로"
        value={mmToCm(photoW)}
        min={0.1}
        decimals={1}
        step={0.1}
        suffix="cm"
        onCommit={(cm) => setPhotoSize({ widthMm: cmToMm(cm) })}
      />
      <CommitNumberInput
        label="세로"
        value={mmToCm(photoH)}
        min={0.1}
        decimals={1}
        step={0.1}
        suffix="cm"
        onCommit={(cm) => setPhotoSize({ heightMm: cmToMm(cm) })}
      />

      <div className="info-card">
        <div className="info-card-title">사진 출력 크기</div>
        <div className="info-card-row">
          <span>mm</span>
          <strong>
            {formatMm(photoW)} × {formatMm(photoH)} mm
          </strong>
        </div>
        <div className="info-card-row">
          <span>cm</span>
          <strong>
            {formatCm(photoW)} × {formatCm(photoH)} cm
          </strong>
        </div>
      </div>

      <h4 className="section-subtitle">그리드</h4>
      <CommitNumberInput
        label="사진 간격"
        value={present.grid.gapMm}
        min={0}
        decimals={1}
        step={0.1}
        suffix="mm"
        onCommit={(gapMm) => setGridSettings({ gapMm })}
      />
      <CommitNumberInput
        label="바깥 여백"
        value={present.grid.outerMarginMm}
        min={0}
        decimals={1}
        step={0.1}
        suffix="mm"
        onCommit={(outerMarginMm) => setGridSettings({ outerMarginMm })}
      />

      <label className="field-row field-row-checkbox">
        <span className="field-label field-label-wide">
          PNG에 사진 구분선 표시
        </span>
        <span className="field-control">
          <input
            type="checkbox"
            checked={present.grid.showGridBorders ?? false}
            onChange={(e) =>
              setGridSettings({ showGridBorders: e.target.checked })
            }
          />
        </span>
      </label>

      <div className="grid-summary">
        {canPlace ? (
          <>
            <div className="info-card-title">배치 요약</div>
            <div className="info-card-row">
              <span>배치 가능 수</span>
              <strong>
                {layout.columns} × {layout.rows}
              </strong>
            </div>
            <div className="info-card-row">
              <span>총 매수</span>
              <strong>{layout.cells.length}장</strong>
            </div>
            <div className="info-card-row">
              <span>사진 크기</span>
              <strong>
                {formatMm(photoW)} × {formatMm(photoH)} mm
              </strong>
            </div>
            <div className="info-card-row">
              <span>사진 간격</span>
              <strong>{formatMm(present.grid.gapMm)} mm</strong>
            </div>
            <div className="info-card-row">
              <span>바깥 여백</span>
              <strong>{formatMm(present.grid.outerMarginMm)} mm</strong>
            </div>
            <div className="info-card-row">
              <span>가로 남는 공간</span>
              <strong>{formatMm(remainXMm)} mm</strong>
            </div>
            <div className="info-card-row">
              <span>세로 남는 공간</span>
              <strong>{formatMm(remainYMm)} mm</strong>
            </div>
          </>
        ) : (
          <div className="grid-summary-warn">
            현재 설정으로는 사진을 배치할 수 없습니다.
            <div className="grid-summary-hint">
              용지 {paper.widthMm}×{paper.heightMm}mm 기준으로 사진 크기·여백을
              조정해 주세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
