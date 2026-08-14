import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { clamp } from '../utils/transform';

interface TransformSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue?: string;
  onBegin: () => void;
  onLiveChange: (value: number) => void;
  onCommit: () => void;
}

/**
 * Range input that batches continuous changes into one transform gesture.
 */
export function TransformSlider({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onBegin,
  onLiveChange,
  onCommit,
}: TransformSliderProps) {
  const gestureActive = useRef(false);
  const clamped = clamp(value, min, max);

  const endGesture = useCallback(() => {
    if (!gestureActive.current) return;
    gestureActive.current = false;
    onCommit();
  }, [onCommit]);

  const startGesture = useCallback(() => {
    if (gestureActive.current) return;
    onBegin();
    gestureActive.current = true;
  }, [onBegin]);

  useEffect(() => {
    const onWindowPointerUp = () => endGesture();
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [endGesture]);

  const onPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startGesture();
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!gestureActive.current) {
      startGesture();
    }
    onLiveChange(Number(event.target.value));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'Home' ||
      event.key === 'End' ||
      event.key === 'PageUp' ||
      event.key === 'PageDown'
    ) {
      startGesture();
    }
  };

  return (
    <label className="transform-slider">
      <span className="transform-slider-label">
        {label}
        <span className="transform-slider-value">
          {displayValue ?? clamped.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onPointerDown={onPointerDown}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={endGesture}
        onBlur={endGesture}
      />
    </label>
  );
}
