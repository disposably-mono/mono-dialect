export type Feedback = "correct" | "present" | "absent";
export type GameStatus = "idle" | "playing" | "won" | "lost";

export interface DailyStatsData {
  currentStreak: number;
  longestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDist: Record<string, number>;
}
