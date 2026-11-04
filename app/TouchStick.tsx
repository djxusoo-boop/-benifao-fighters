"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { joystickIntent } from "./touch-joystick.mjs";

export type StickIntent = { left: boolean; right: boolean; up: boolean; down: boolean };

type Props = {
  onChange: (intent: StickIntent) => void;
  label: string;
  hint?: string;
  className?: string;
};

const NEUTRAL: StickIntent = { left: false, right: false, up: false, down: false };

// The same thumb stick as the fight mode, for every other mode. It always sits
// bottom-left; the action buttons of each mode go bottom-right.
export default function TouchStick({ onChange, label, hint, className = "" }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const intentRef = useRef<StickIntent>(NEUTRAL);
  const onChangeRef = useRef(onChange);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const emit = (next: StickIntent) => {
    const previous = intentRef.current;
    if (previous.left === next.left && previous.right === next.right && previous.up === next.up && previous.down === next.down) return;
    intentRef.current = next;
    onChangeRef.current(next);
  };

  const track = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const bounds = base.getBoundingClientRect();
    const radius = bounds.width * 0.42;
    const intent = joystickIntent(clientX - (bounds.left + bounds.width / 2), clientY - (bounds.top + bounds.height / 2), radius);
    setKnob({ x: intent.x, y: intent.y });
    emit({ left: intent.left, right: intent.right, up: intent.jump, down: intent.crouch });
  };

  const release = () => {
    pointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    emit(NEUTRAL);
  };

  useEffect(() => () => { if (pointerRef.current !== null) onChangeRef.current(NEUTRAL); }, []);

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (pointerRef.current !== null) return;
    pointerRef.current = event.pointerId;
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Capture is a nicety. */ }
    track(event.clientX, event.clientY);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    track(event.clientX, event.clientY);
  };
  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    event.preventDefault();
    release();
  };

  return (
    <div className={`mode-stick-wrap ${className}`}>
      <div ref={baseRef} className="mode-stick" role="group" aria-label={label} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={release}>
        <span className="mode-stick-arrows" aria-hidden="true"><i className="up">↑</i><i className="left">←</i><i className="right">→</i><i className="down">↓</i></span>
        <span className="mode-stick-knob" style={{ "--kx": knob.x, "--ky": knob.y } as CSSProperties} aria-hidden="true" />
      </div>
      {hint && <small className="mode-stick-hint">{hint}</small>}
    </div>
  );
}
