import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  formatPaperOptionLabel,
  getPaperPreset,
  PAPER_PRESET_LIST,
} from '../constants/paper';
import { useEditorStore } from '../stores/editorStore';

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function PaperSection() {
  const paper = useEditorStore((s) => s.history.present.paper);
  const setPaper = useEditorStore((s) => s.setPaper);
  const setBackgroundColorLive = useEditorStore((s) => s.setBackgroundColorLive);
  const commitBackgroundColor = useEditorStore((s) => s.commitBackgroundColor);
  const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);

  const preset = getPaperPreset(paper.paperId);
  const [hexDraft, setHexDraft] = useState(paper.backgroundColor);
  const colorGesture = useRef(false);

  useEffect(() => {
    if (!colorGesture.current) {
      setHexDraft(paper.backgroundColor);
    }
  }, [paper.backgroundColor]);

  const onColorPointerDown = () => {
    colorGesture.current = true;
  };

  const onColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase();
    setHexDraft(value);
    setBackgroundColorLive(value);
  };

  const endColorGesture = () => {
    if (!colorGesture.current) return;
    colorGesture.current = false;
    commitBackgroundColor();
  };

  const onHexBlur = () => {
    const normalized = normalizeHex(hexDraft);
    if (!normalized) {
      setHexDraft(paper.backgroundColor);
      return;
    }
    setHexDraft(normalized);
    if (normalized !== paper.backgroundColor) {
      setBackgroundColor(normalized);
    }
  };

  return (
    <div className="section-stack">
      <label className="field-row field-row-stack">
        <span className="field-label">용지 크기</span>
        <select
          className="paper-preset-select"
          value={preset.id}
          onChange={(e) => setPaper(e.target.value)}
        >
          {PAPER_PRESET_LIST.map((item) => (
            <option key={item.id} value={item.id}>
              {formatPaperOptionLabel(item)}
            </option>
          ))}
        </select>
      </label>

      <div className="info-card">
        <div className="info-card-row">
          <span>출력 크기</span>
          <strong>
            {preset.widthMm} × {preset.heightMm} mm
          </strong>
        </div>
        <div className="info-card-row">
          <span>이미지 해상도</span>
          <strong>
            {preset.widthPx} × {preset.heightPx} px
          </strong>
        </div>
      </div>

      <p className="paper-print-note">
        다운로드 PNG는 위 해상도로 생성됩니다. 인쇄 시 이미지 크기 조정 없이
        원본 크기로 출력해야 설정한 실제 용지 크기를 유지할 수 있습니다.
      </p>

      <div className="field-row">
        <span className="field-label">용지 색상</span>
        <span className="field-control field-control-color">
          <input
            type="color"
            value={HEX_RE.test(hexDraft) ? hexDraft : paper.backgroundColor}
            onPointerDown={onColorPointerDown}
            onChange={onColorChange}
            onPointerUp={endColorGesture}
            onPointerCancel={endColorGesture}
            onBlur={endColorGesture}
          />
          <input
            type="text"
            className="hex-input"
            value={hexDraft}
            maxLength={7}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={onHexBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </span>
      </div>
    </div>
  );
}
