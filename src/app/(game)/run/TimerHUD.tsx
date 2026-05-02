"use client";
// src/app/(game)/run/TimerHUD.tsx

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;      // total seconds for this round
  isActive: boolean;    // pause when submitting / between rounds
  onExpired: () => void;
}

export default function TimerHUD({ seconds, isActive, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number>(seconds);
  // Initialized to null — set inside the effect where side-effects are allowed.
  const startTimeRef = useRef<number | null>(null);
  const expiredRef   = useRef(false);

  useEffect(() => {
    // On every new round (seconds changes) or resume, stamp the start time
    // and reset the expired guard here in the effect — the only safe place
    // to call Date.now().
    startTimeRef.current = Date.now();
    expiredRef.current   = false;

    if (!isActive) return;

    const getRemaining = () =>
      Math.max(0, seconds - Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));

    // Snap display immediately on start/resume.
    setRemaining(getRemaining());

    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(id);
        onExpired();
      }
    }, 500);

    return () => clearInterval(id);
  }, [isActive, seconds, onExpired]);

  const pct              = remaining / seconds;
  const danger           = remaining <= 10;
  const warning          = remaining <= 20 && !danger;
  const size             = 52;
  const radius           = 22;
  const circumference    = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  const ringColor = danger
    ? "#E85D5D"
    : warning
    ? "var(--highlight, #C8A84B)"
    : "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border)" strokeWidth={3}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.45s linear, stroke 300ms var(--ease)" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: danger ? 15 : 14,
            fontWeight: 500,
            color: ringColor,
            transition: "color 300ms var(--ease), font-size 150ms var(--ease)",
          }}
        >
          {remaining}
        </div>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        sec
      </span>
    </div>
  );
}