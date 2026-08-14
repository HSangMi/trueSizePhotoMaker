import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

interface CommitNumberInputProps {
  id?: string;
  label: string;
  value: number;
  step?: number;
  min?: number;
  /** How many decimal places to keep on commit */
  decimals?: number;
  suffix?: string;
  onCommit: (value: number) => void;
}

export function formatNumber(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

/**
 * Parse a draft string into a commit candidate.
 * Returns null when the draft is incomplete or invalid.
 */
export function parseCommitNumber(
  draft: string,
  min: number,
  decimals: number,
): number | null {
  const trimmed = draft.trim();
  if (
    trimmed === '' ||
    trimmed === '.' ||
    trimmed === '-' ||
    trimmed === '-.' ||
    trimmed === '+'
  ) {
    return null;
  }

  // Reject incomplete trailing decimal like "3." by requiring a finite Number
  // but still allow "3.0" / "3.5".
  if (/[eE]/.test(trimmed)) {
    return null;
  }

  // Treat trailing decimal as incomplete draft (e.g. "3.")
  if (trimmed.endsWith('.')) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(parsed * factor) / factor;
}

/**
 * Local draft number field — commits on blur / Enter after validation.
 * Escape cancels the draft without committing.
 */
export function CommitNumberInput({
  id,
  label,
  value,
  step = 0.1,
  min = 0,
  decimals = 1,
  suffix,
  onCommit,
}: CommitNumberInputProps) {
  const [draft, setDraft] = useState(() => formatNumber(value, decimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatNumber(value, decimals));
    }
  }, [value, decimals]);

  const commit = () => {
    const rounded = parseCommitNumber(draft, min, decimals);
    if (rounded === null) {
      setDraft(formatNumber(value, decimals));
      return;
    }

    setDraft(formatNumber(rounded, decimals));
    if (rounded !== value) {
      onCommit(rounded);
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // Restore draft without blur to avoid onBlur committing a stale draft.
      setDraft(formatNumber(value, decimals));
    }
  };

  return (
    <label className="field-row" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          step={step}
          onChange={onChange}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={onKeyDown}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
    </label>
  );
}
