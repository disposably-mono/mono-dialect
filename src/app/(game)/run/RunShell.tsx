"use client";
// src/app/(game)/run/RunShell.tsx

import { useRouter } from "next/navigation";
import { useRunState } from "./useRunState";
import RunConfigScreen from "./RunConfigScreen";
import RunGameScreen from "./RunGameScreen";
import RunEndScreen from "./RunEndScreen";

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
  const {
    state,
    startRun,
    addLetter,
    deleteLetter,
    submitGuess,
    onTimerExpired,
    resetRun,
    showToast,
  } = useRunState({ userId, previousHighScore });

  function handleRunEnd() {
    // Refresh server component so nav stats update
    router.refresh();
    resetRun();
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative",
      }}
    >
      {/* Phase: config */}
      {state.phase === "config" && (
        <RunConfigScreen
          onStart={startRun}
          isLoading={false}
        />
      )}

      {/* Phase: playing */}
      {state.phase === "playing" && (
        <RunGameScreen
          state={state}
          onLetter={addLetter}
          onDelete={deleteLetter}
          onSubmit={submitGuess}
          onTimerExpired={onTimerExpired}
          showToast={showToast}
        />
      )}

      {/* Phase: ended */}
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
    </div>
  );
}
