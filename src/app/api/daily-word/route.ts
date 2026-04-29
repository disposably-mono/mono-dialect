import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

    const dailyWord = await db.dailyWord.findUnique({
      where: { date: today },
    });

    if (!dailyWord) {
      return NextResponse.json(
        { error: "No word set for today. Run the cron job or seed a word first." },
        { status: 404 }
      );
    }

    // Sign a short-lived token containing the word — word never travels to client in plaintext
    const token = await new SignJWT({ word: dailyWord.word, date: today })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({
      length: dailyWord.length,
      date: today,
      token,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
