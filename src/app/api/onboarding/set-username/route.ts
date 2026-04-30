// src/app/api/onboarding/set-username/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

const RULES = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { username } = await req.json();

  if (!username || !RULES.test(username)) {
    return NextResponse.json(
      { error: "Invalid username format." },
      { status: 400 }
    );
  }

  // Check for taken username
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 }
    );
  }

  // Save username and initialize stat records in one transaction
  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { username },
    }),
    db.dailyStats.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    }),
    db.rogueStats.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    }),
  ]);

  return NextResponse.json({ ok: true });
}
