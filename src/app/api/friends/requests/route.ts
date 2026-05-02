// src/app/api/friends/requests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — fetch pending incoming requests for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const requests = await db.friendRequest.findMany({
      where: { receiverId: userId, status: "pending" },
      select: {
        id: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            username: true,
            image: true,
            rogueStats: { select: { highScore: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        requestId: r.id,
        createdAt: r.createdAt,
        sender: {
          id: r.sender.id,
          username: r.sender.username,
          image: r.sender.image,
          highScore: r.sender.rogueStats?.highScore ?? 0,
        },
      })),
    });
  } catch (err) {
    console.error("[friends/requests] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
