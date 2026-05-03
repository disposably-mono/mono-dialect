// src/components/AmbientPlayer.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Scene = "rain" | "fire" | "hum";

const SCENES: { id: Scene; label: string; icon: string }[] = [
  { id: "rain", label: "Rain",    icon: "🌧" },
  { id: "fire", label: "Fire",    icon: "🔥" },
  { id: "hum",  label: "Lo-fi",   icon: "🎵" },
];

// ── Procedural audio builders ────────────────────────────────────────────────

function buildRain(ctx: AudioContext, masterGain: GainNode): () => void {
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();

  src.buffer    = buf;
  src.loop      = true;
  filter.type   = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.4;
  gain.gain.value = 0.18;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();

  return () => { try { src.stop(); } catch {} };
}

function buildFire(ctx: AudioContext, masterGain: GainNode): () => void {
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();
  const lfo    = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  src.buffer    = buf;
  src.loop      = true;
  filter.type   = "lowpass";
  filter.frequency.value = 600;
  lfo.frequency.value    = 0.8;
  lfoGain.gain.value     = 80;
  gain.gain.value        = 0.14;

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();
  lfo.start();

  return () => { try { src.stop(); lfo.stop(); } catch {} };
}

function buildHum(ctx: AudioContext, masterGain: GainNode): () => void {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 55;
  osc2.frequency.value = 82.4;
  gain.gain.value = 0.06;

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);
  osc1.start();
  osc2.start();

  return () => { try { osc1.stop(); osc2.stop(); } catch {} };
}

const BUILDERS = { rain: buildRain, fire: buildFire, hum: buildHum };

// ── Component ────────────────────────────────────────────────────────────────

export default function AmbientPlayer() {
  const [open,    setOpen]    = useState(false);
  const [active,  setActive]  = useState<Scene | null>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem("ambient-scene") as Scene) ?? null;
  });
  const [volume,  setVolume]  = useState(() => {
    if (typeof window === "undefined") return 0.7;
    return parseFloat(localStorage.getItem("ambient-vol") ?? "0.7");
  });

  const ctxRef     = useRef<AudioContext | null>(null);
  const stopRef    = useRef<(() => void) | null>(null);
  const masterRef  = useRef<GainNode | null>(null);

  function getCtx() {
    if (!ctxRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      ctxRef.current  = new AC();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);
      masterRef.current.gain.value = volume;
    }
    return ctxRef.current;
  }

  function startScene(scene: Scene) {
    stopRef.current?.();
    const c = getCtx();
    if (!masterRef.current) return;
    const rawStop = BUILDERS[scene](c, masterRef.current);
    stopRef.current = rawStop;
  }

  function stopScene() {
    stopRef.current?.();
    stopRef.current = null;
  }

  function toggleScene(scene: Scene) {
    if (active === scene) {
      stopScene();
      setActive(null);
      localStorage.removeItem("ambient-scene");
    } else {
      startScene(scene);
      setActive(scene);
      localStorage.setItem("ambient-scene", scene);
    }
  }

  function handleVolume(v: number) {
    setVolume(v);
    localStorage.setItem("ambient-vol", String(v));
    if (masterRef.current) masterRef.current.gain.value = v;
  }

  // Resume on mount if a scene was persisted
  useEffect(() => {
    if (active) startScene(active);
    return () => stopScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle keyboard events - prevent Enter from toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Enter key from activating the button when it's focused
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        // Check if the focused element is the ambient toggle button
        if (target.classList?.contains('ambient-toggle')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <style>{`
        .ambient-wrap {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .ambient-panel {
          background: var(--bg-2);
          border: 0.5px solid var(--border-hover);
          border-radius: var(--radius-md, 12px);
          padding: 14px;
          width: 192px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: ambientReveal 180ms var(--ease) both;
        }

        @keyframes ambientReveal {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ambient-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .ambient-scenes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }

        .ambient-scene-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: var(--radius-sm, 6px);
          border: 0.5px solid var(--border);
          background: var(--bg-3);
          cursor: pointer;
          transition: border-color 140ms var(--ease), background 140ms var(--ease);
          font-size: 18px;
          line-height: 1;
        }

        .ambient-scene-btn.active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, var(--bg-3));
        }

        .ambient-scene-btn span {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .ambient-vol-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .ambient-slider {
          width: 100%;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .ambient-toggle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 0.5px solid var(--border);
          background: var(--bg-2);
          color: var(--text-muted);
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 160ms var(--ease), color 160ms var(--ease),
                      background 160ms var(--ease), transform 120ms var(--ease);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .ambient-toggle:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .ambient-toggle:active { transform: scale(0.93); }

        .ambient-toggle.has-active {
          border-color: var(--accent);
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 10%, var(--bg-2));
        }
      `}</style>

      <div className="ambient-wrap">
        {open && (
          <div className="ambient-panel">
            <p className="ambient-label">Ambient</p>
            <div className="ambient-scenes">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  className={`ambient-scene-btn${active === s.id ? " active" : ""}`}
                  onClick={() => toggleScene(s.id)}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            <p className="ambient-vol-label">Volume</p>
            <input
              className="ambient-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => handleVolume(parseFloat(e.target.value))}
            />
          </div>
        )}

        <button
          className={`ambient-toggle${active ? " has-active" : ""}`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          aria-label="Ambient sounds"
          title="Ambient sounds"
        >
          {active === "rain" ? "🌧" : active === "fire" ? "🔥" : active === "hum" ? "🎵" : "♪"}
        </button>
      </div>
    </>
  );
}
