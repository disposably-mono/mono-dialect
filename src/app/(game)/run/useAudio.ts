// src/app/(game)/run/useAudio.ts
"use client";

import { useRef, useCallback } from "react";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  return AC ? new AC() : null;
}

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  function ctx(): AudioContext | null {
    if (!ctxRef.current) ctxRef.current = getCtx();
    return ctxRef.current;
  }

  // ── primitives ────────────────────────────────────────────────────────────

  function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gainPeak = 0.18,
    startOffset = 0,
    ac?: AudioContext
  ) {
    const c = ac ?? ctx();
    if (!c) return;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime + startOffset);
    gain.gain.setValueAtTime(0, c.currentTime + startOffset);
    gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + startOffset + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startOffset + duration);
    osc.start(c.currentTime + startOffset);
    osc.stop(c.currentTime  + startOffset + duration + 0.01);
  }

  function playNoise(duration: number, gainPeak = 0.08, startOffset = 0, ac?: AudioContext) {
    const c = ac ?? ctx();
    if (!c) return;
    const bufSize = c.sampleRate * duration;
    const buf     = c.createBuffer(1, bufSize, c.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src  = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(gainPeak, c.currentTime + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startOffset + duration);
    src.start(c.currentTime + startOffset);
    src.stop(c.currentTime  + startOffset + duration + 0.01);
  }

  // ── game sounds ───────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    // Short click for each timer second
    playTone(880, 0.008, "sine", 0.12);
  }, []);

  const correct = useCallback(() => {
    // Ascending two-tone chime C5 → E5
    const c = ctx();
    if (!c) return;
    playTone(523.25, 0.09, "sine", 0.15, 0,    c);
    playTone(659.25, 0.12, "sine", 0.13, 0.09, c);
  }, []);

  const wrong = useCallback(() => {
    // Low dull thud
    playTone(120, 0.06, "sine", 0.14);
    playNoise(0.05, 0.04);
  }, []);

  const roundWin = useCallback(() => {
    // C5 → E5 → G5 arpeggio
    const c = ctx();
    if (!c) return;
    playTone(523.25, 0.10, "sine", 0.16, 0,    c);
    playTone(659.25, 0.10, "sine", 0.14, 0.10, c);
    playTone(783.99, 0.16, "sine", 0.18, 0.20, c);
  }, []);

  const bossRound = useCallback(() => {
    // Tense descending interval — signals boss word incoming
    const c = ctx();
    if (!c) return;
    playTone(440,   0.12, "sawtooth", 0.10, 0,    c);
    playTone(369.99,0.16, "sawtooth", 0.12, 0.12, c);
  }, []);

  const runOver = useCallback(() => {
    // Descending minor interval
    const c = ctx();
    if (!c) return;
    playTone(392,   0.14, "sine", 0.14, 0,    c);
    playTone(349.23,0.14, "sine", 0.12, 0.14, c);
    playTone(293.66,0.22, "sine", 0.10, 0.28, c);
  }, []);

  return { tick, correct, wrong, roundWin, bossRound, runOver };
}
