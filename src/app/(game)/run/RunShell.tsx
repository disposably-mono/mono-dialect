"use client";
// src/app/(game)/run/RunShell.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRunState } from "./useRunState";
import RunConfigScreen from "./RunConfigScreen";
import RunGameScreen from "./RunGameScreen";
import RunEndScreen from "./RunEndScreen";
import AbandonModal from "./AbandonModal";

interface Props {
  userId: string | null;
  username: string | null;
  previousHighScore: number;
  totalRuns: number;
  totalRounds: number;
}

export default function RunShell({
  userId,
  username,
  previousHighScore,
  totalRuns,
  totalRounds,
}: Props) {
  const router = useRouter();
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  const {
    state,
    mounted,
    startRun,
    addLetter,
    deleteLetter,
    submitGuess,
    onTimerExpired,
    resetRun,
    showToast,
  } = useRunState({ userId, previousHighScore });

  function handleRunEnd() {
    router.refresh();
    resetRun();
  }

  // Abandon: dispatch RESET (phase → config, localStorage cleared by useEffect),
  // then refresh so server stats re-fetch.
  function handleAbandonConfirm() {
    setShowAbandonModal(false);
    resetRun();
    router.refresh();
  }

  if (!mounted) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
          loading…
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      {state.phase === "config" && (
        <RunConfigScreen onStart={startRun} isLoading={false} />
      )}

      {state.phase === "playing" && (
        <RunGameScreen
          state={state}
          onLetter={addLetter}
          onDelete={deleteLetter}
          onSubmit={submitGuess}
          onTimerExpired={onTimerExpired}
          onAbandon={() => setShowAbandonModal(true)}
          showToast={showToast}
        />
      )}

      {state.phase === "ended" && (
        <RunEndScreen
          state={state}
          username={username}
          previousHighScore={previousHighScore}
          totalRuns={totalRuns}
          totalRounds={totalRounds}
          onPlayAgain={handleRunEnd}
        />
      )}

      <AbandonModal
        isOpen={showAbandonModal}
        onConfirm={handleAbandonConfirm}
        onCancel={() => setShowAbandonModal(false)}
      />
    </div>
  );
}