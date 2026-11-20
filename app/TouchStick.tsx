"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { joystickIntent, trackHeldPointer } from "./touch-joystick.mjs";

export type StickIntent = { left: boolean; right: boolean; up: boolean; down: boolean };

type Props = {
  onChange: (intent: StickIntent) => void;
  label: string;
  hint?: string;
  className?: string;
  fightStyle?: boolean;
};

const NEUTRAL: StickIntent = { left: false, right: false, up: false, down: false };

// The same thumb stick as the fight mode, for every other mode. It always sits
// bottom-left; the action buttons of each mode go bottom-right.
export default function TouchStick({ onChange, label, hint, className = "", fightStyle = false }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const trackingRef = useRef<(() => void) | null>(null);
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
    setKnob(current => current.x === intent.x && current.y === intent.y ? current : { x: intent.x, y: intent.y });
    emit({ left: intent.left, right: intent.right, up: intent.jump, down: intent.crouch });
  };

  const release = () => {
    trackingRef.current = null;
    setKnob({ x: 0, y: 0 });
    emit(NEUTRAL);
  };

  useEffect(() => () => {
    if (trackingRef.current) {
      trackingRef.current();
      onChangeRef.current(NEUTRAL);
    }
  }, []);

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (trackingRef.current) return;
    trackingRef.current = trackHeldPointer(event.currentTarget, event.pointerId, { move: track, release });
    track(event.clientX, event.clientY);
  };

  const baseClass = fightStyle ? "touch-joystick" : "mode-stick";
  return (
    <div className={`${baseClass}-wrap ${className}`}>
      <div ref={baseRef} className={baseClass} role="group" aria-label={label} onPointerDown={begin}>
        <span className={`${baseClass}-arrows`} aria-hidden="true"><i className="up">↑</i><i className="left">←</i><i className="right">→</i><i className="down">↓</i></span>
        <span className={fightStyle ? "touch-joystick-stick" : "mode-stick-knob"} style={fightStyle
          ? { transform: `translate(${knob.x * 30}px, ${knob.y * 30}px)` }
          : { "--kx": knob.x, "--ky": knob.y } as CSSProperties} aria-hidden="true" />
      </div>
      {hint && <small className={fightStyle ? "touch-joystick-label" : "mode-stick-hint"}>{hint}</small>}
    </div>
  );
}
