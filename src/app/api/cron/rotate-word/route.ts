import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

type WordBank = {
  meta: Record<string, unknown>;
  easy: Record<string, string[]>;
  hard: Record<string, string[]>;
};

function getDateString(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function pickWord(wordBank: WordBank, date: string): { word: string; length: number } {
  // Daily words come from easy 5-letter pool — most recognizable, fairest for all players
  // Falls back to 4-letter if pool is empty
  const pool = [
    ...(wordBank.easy["5"] ?? []),
    ...(wordBank.easy["4"] ?? []),
  ];

  if (pool.length === 0) throw new Error("Word pool is empty");

  // Deterministic pick based on date so re-runs on same date always pick the same word
  let hash = 0;
  for (const c of date) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const word = pool[hash % pool.length];

  return { word: word.toUpperCase(), length: word.length };
}

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wordBankPath = path.join(process.cwd(), "public", "words", "en.json");
    const wordBank: WordBank = JSON.parse(fs.readFileSync(wordBankPath, "utf-8"));

    // In production: always rotate to tomorrow
    // In development: allow ?date=YYYY-MM-DD override for seeding today's word during testing
    const devDate =
      process.env.NODE_ENV !== "production"
        ? req.nextUrl.searchParams.get("date") ?? undefined
        : undefined;

    const date = devDate ?? getDateString(1); // default: tomorrow

    // Idempotent — skip if already rotated for this date
    const existing = await db.dailyWord.findUnique({ where: { date } });
    if (existing) {
      return NextResponse.json({
        message: "Already set for this date",
        date,
        word: existing.word,
      });
    }

    const { word, length } = pickWord(wordBank, date);

    await db.dailyWord.create({ data: { date, word, length } });

    return NextResponse.json({ message: "Word set", date, word, length });
  } catch (error) {
    console.error("[cron/rotate-word]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
