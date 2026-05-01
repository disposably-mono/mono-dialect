"use client";
// src/app/(game)/run/TimerHUD.tsx

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;         // total seconds for this round
  isActive: boolean;       // pause when submitting / between rounds
  onExpired: () => void;
}

export default function TimerHUD({ seconds, isActive, onExpired }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  // Reset when a new round starts (seconds prop changes)
  useEffect(() => {
    setRemaining(seconds);
    expiredRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpired();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onExpired]);

  const pct = remaining / seconds;
  const danger = remaining <= 10;
  const warning = remaining <= 20 && !danger;

  // SVG ring
  const size = 52;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);

  const ringColor = danger
    ? "#E85D5D"
    : warning
    ? "var(--highlight, #C8A84B)"
    : "var(--accent)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={3}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 300ms var(--ease)" }}
          />
        </svg>
        {/* Number */}
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
          fontSize: 9,
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
