"use client";
// src/app/(game)/run/TimerHUD.tsx

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;
  isActive: boolean;
  onExpired: () => void;
}

export default function TimerHUD({ seconds, isActive, onExpired }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const remainingRef = useRef(seconds);
  const lastTickRef  = useRef<number | null>(null);
  const expiredRef   = useRef(false);

  // No reset effect needed — component is keyed per round and remounts fresh,
  // so useState(seconds) always initializes with the correct value.

  useEffect(() => {
    if (!isActive) {
      // Pause: clear the last tick so we don't accumulate time while paused
      lastTickRef.current = null;
      return;
    }

    // Resume: stamp now as the start of this active window
    lastTickRef.current = Date.now();

    const id = setInterval(() => {
      const now     = Date.now();
      const elapsed = Math.floor((now - (lastTickRef.current ?? now)) / 1000);
      if (elapsed < 1) return;

      lastTickRef.current = now;
      const next = Math.max(0, remainingRef.current - elapsed);
      remainingRef.current = next;
      setRemaining(next);

      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(id);
        onExpired();
      }
    }, 250);

    return () => clearInterval(id);
  }, [isActive, onExpired]);

  const pct           = remaining / seconds;
  const danger        = remaining <= 10;
  const warning       = remaining <= 20 && !danger;
  const size          = 52;
  const radius        = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - pct);
  const ringColor     = danger
    ? "#E85D5D"
    : warning
    ? "var(--highlight, #C8A84B)"
    : "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth={3} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.22s linear, stroke 300ms var(--ease)" }}
          />
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: danger ? 15 : 14,
          fontWeight: 500,
          color: ringColor,
          transition: "color 300ms var(--ease)",
        }}>
          {remaining}
        </div>
      </div>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-muted)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        sec
      </span>
    </div>
  );
}
