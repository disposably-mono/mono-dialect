"use client";
// src/app/(game)/run/RunConfigScreen.tsx

import { useState } from "react";
import {
  RunConfig,
  Difficulty,
  SubMode,
  TimeLimit,
  LivesCount,
  GuessesPerLife,
  DIFF_MULTIPLIERS,
  TIMED_MULTIPLIERS,
  LIVES_MULTIPLIERS,
  getCombinedMultiplier,
} from "./types";

interface Props {
  onStart: (config: RunConfig) => void;
  isLoading: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--accent)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        · {label}
      </span>
    </div>
  );
}

function OptionCard({
  selected,
  accent = "green",
  onClick,
  title,
  description,
  tag,
}: {
  selected: boolean;
  accent?: "green" | "lavender";
  onClick: () => void;
  title: string;
  description: string;
  tag?: string;
}) {
  const borderColor = selected
    ? accent === "green"
      ? "var(--accent)"
      : "var(--lavender-grey, #8D99AE)"
    : "var(--border)";
  const bg = selected
    ? accent === "green"
      ? "color-mix(in srgb, var(--accent) 8%, var(--bg-2))"
      : "color-mix(in srgb, var(--highlight) 6%, var(--bg-2))"
    : "var(--bg-2)";

  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        padding: "14px",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 160ms var(--ease), background 160ms var(--ease)",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Selection dot */}
      <span
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: accent === "green" ? "var(--accent)" : "var(--lavender-grey, #8D99AE)",
          opacity: selected ? 1 : 0,
          transition: "opacity 160ms var(--ease)",
          display: "block",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {title}
        </span>
        {tag && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: accent === "green" ? "var(--accent)" : "var(--lavender-grey, #8D99AE)",
              border: `0.5px solid currentColor`,
              borderRadius: "4px",
              padding: "1px 5px",
              letterSpacing: "0.05em",
            }}
          >
            {tag}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          lineHeight: 1.5,
          fontFamily: "var(--font-sans)",
          margin: 0,
        }}
      >
        {description}
      </p>
    </button>
  );
}

function ParamButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: active
          ? "color-mix(in srgb, var(--accent) 10%, var(--bg-2))"
          : "var(--bg-2)",
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: "pointer",
        transition: "all 120ms var(--ease)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function MultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "var(--text-sec, var(--text-muted))",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: highlight ? "20px" : "13px",
          fontWeight: 500,
          color: highlight ? "var(--highlight, #C8A84B)" : "var(--accent)",
          transition: "all 300ms var(--ease)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Scoring reference sidebar — width unified to 280px ────────────────────────

function ScoringSidebar() {
  const rows = [
    { label: "Base score", value: "100 × (guesses left + 1)" },
    { label: "Length bonus", value: "(len − min) × 15" },
    { label: "Difficulty", value: "Easy 1.00× / Hard 1.75×" },
    { label: "Sub-mode", value: "0.50× – 2.50×" },
    { label: "Streak", value: "1 + (rounds × 0.05)" },
  ];

  return (
    <aside
      style={{
        padding: "24px 20px",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "280px",
        flexShrink: 0,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "16px",
          color: "var(--text-primary)",
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        Scoring formula
      </h2>

      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              padding: "9px 12px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              {r.label}
            </span>
            <span style={{ fontSize: "10px", color: "var(--accent)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Word length scaling
        </p>
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {[
            { label: "Easy 3→4→5→6", value: "every 2 wins" },
            { label: "Hard 5→6→7", value: "every 2 wins" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderBottom: i === 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                {r.label}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-sec, var(--text-muted))", fontFamily: "var(--font-mono)" }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Example callout */}
      <div
        style={{
          background: "color-mix(in srgb, var(--accent) 6%, var(--bg-2))",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "12px",
        }}
      >
        <p style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px", letterSpacing: "0.05em" }}>
          EXAMPLE · Hard / 30s / 5-round streak
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-sec, var(--text-muted))", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
          (400 + 15) × 1.75 × 2.00 × 1.25
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--highlight, #C8A84B)", fontWeight: 500, margin: "4px 0 0" }}>
          = 1,816 pts
        </p>
      </div>
    </aside>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RunConfigScreen({ onStart, isLoading }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [subMode, setSubMode] = useState<SubMode>("timed");
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(30);
  const [lives, setLives] = useState<LivesCount>(1);
  const [guessesPerLife, setGuessesPerLife] = useState<GuessesPerLife>(3);

  const config: RunConfig = {
    difficulty,
    subMode,
    ...(subMode === "timed" ? { timeLimit } : { lives, guessesPerLife }),
  };

  const diffMult = DIFF_MULTIPLIERS[difficulty];
  const modeMult =
    subMode === "timed"
      ? TIMED_MULTIPLIERS[timeLimit]
      : LIVES_MULTIPLIERS[`${lives}-${guessesPerLife}`] ?? 2.5;
  const streakMult = 1.25; // preview: est. 5-round streak
  const combined = getCombinedMultiplier(config, 5);

  function handleStart() {
    onStart(config);
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Main config area ── */}
      <div
        style={{
          flex: 1,
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          overflowY: "auto",
          minWidth: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Configure run
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              marginTop: "4px",
              marginBottom: 0,
            }}
          >
            Set your parameters and see your score multiplier before starting.
          </p>
        </div>

        {/* Step 1: Sub-mode */}
        <div>
          <StepLabel number="01" label="Sub-mode" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <OptionCard
              selected={subMode === "timed"}
              accent="green"
              onClick={() => setSubMode("timed")}
              title="Timed"
              description="Solve each word before the clock runs out. Timer resets per round."
            />
            <OptionCard
              selected={subMode === "lives"}
              accent="green"
              onClick={() => setSubMode("lives")}
              title="Lives"
              description="Configure lives and guesses. Lose a life when you exhaust your guesses."
            />
          </div>
        </div>

        {/* Step 2: Difficulty */}
        <div>
          <StepLabel number="02" label="Difficulty" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <OptionCard
              selected={difficulty === "easy"}
              accent="green"
              onClick={() => setDifficulty("easy")}
              title="Easy"
              tag="1.00×"
              description="3–6 letters · Common words · Hints on last 2 guesses"
            />
            <OptionCard
              selected={difficulty === "hard"}
              accent="lavender"
              onClick={() => setDifficulty("hard")}
              title="Hard"
              tag="1.75×"
              description="5–7 letters · Rare words only · No hints ever"
            />
          </div>
        </div>

        {/* Step 3: Sub-mode params */}
        {subMode === "timed" && (
          <div>
            <StepLabel number="03" label="Time limit per round" />
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                Seconds per round
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {([30, 45, 60] as TimeLimit[]).map((t) => (
                  <ParamButton key={t} active={timeLimit === t} onClick={() => setTimeLimit(t)}>
                    {t}s · {TIMED_MULTIPLIERS[t].toFixed(2)}×
                  </ParamButton>
                ))}
              </div>
            </div>
          </div>
        )}

        {subMode === "lives" && (
          <div>
            <StepLabel number="03" label="Lives configuration" />
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                  Lives
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {([1, 2, 3] as LivesCount[]).map((l) => (
                    <ParamButton key={l} active={lives === l} onClick={() => setLives(l)}>
                      {l}
                    </ParamButton>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                  Guesses / life
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {([3, 4, 5] as GuessesPerLife[]).map((g) => {
                    const key = `${lives}-${g}`;
                    const valid = key in LIVES_MULTIPLIERS;
                    return valid ? (
                      <ParamButton
                        key={g}
                        active={guessesPerLife === g}
                        onClick={() => setGuessesPerLife(g)}
                      >
                        {g}
                      </ParamButton>
                    ) : null;
                  })}
                </div>
              </div>
              {/* Validity note */}
              {!LIVES_MULTIPLIERS[`${lives}-${guessesPerLife}`] && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-sans)", margin: 0 }}>
                  Select a valid lives / guesses combination above.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Multiplier preview */}
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            Multiplier preview
          </p>
          <MultRow label="Difficulty" value={`${diffMult.toFixed(2)}×`} />
          <MultRow
            label={subMode === "timed" ? `Time limit (${timeLimit}s)` : `Lives (${lives}L · ${guessesPerLife}G)`}
            value={`${modeMult.toFixed(2)}×`}
          />
          <MultRow label="Streak (est. ×5 rounds)" value={`${streakMult.toFixed(2)}×`} />
          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: "10px",
              paddingTop: "10px",
            }}
          >
            <MultRow label="Combined" value={`${combined.toFixed(2)}×`} highlight />
          </div>
        </div>

        {/* Start CTA — primary: opacity fade, scale(0.98) press */}
        <button
          onClick={handleStart}
          disabled={isLoading || (subMode === "lives" && !LIVES_MULTIPLIERS[`${lives}-${guessesPerLife}`])}
          style={{
            width: "100%",
            background: isLoading ? "var(--bg-3)" : "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: isLoading ? "var(--text-muted)" : "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            fontWeight: 600,
            padding: "14px",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "opacity 160ms var(--ease), transform 120ms var(--ease)",
            letterSpacing: "0.01em",
            marginTop: "auto",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseDown={(e) => {
            if (!isLoading) e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isLoading ? "Starting run…" : "Start run →"}
        </button>
      </div>

      {/* ── Scoring sidebar ── */}
      <ScoringSidebar />
    </div>
  );
}