// src/app/api/friends/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = session.user.id;
    const query = req.nextUrl.searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Accept both raw user ID (cuid) and username
    // A cuid starts with 'c' and is ~25 chars; a username is 3-20 chars
    // We try both and return first match
    const isLikelyId = query.length > 20 && /^c[a-z0-9]+$/.test(query);

    const user = await db.user.findFirst({
      where: isLikelyId
        ? { id: query }
        : { username: { equals: query, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        image: true,
        rogueStats: {
          select: { highScore: true, totalRuns: true },
        },
      },
    });

    if (!user || !user.username) {
      return NextResponse.json({ result: null });
    }

    if (user.id === viewerId) {
      return NextResponse.json({ result: null, error: "that_is_you" });
    }

    // Check relationship status
    const [friendship, sentReq, recvReq] = await Promise.all([
      db.friendship.findFirst({
        where: {
          OR: [
            { userAId: viewerId, userBId: user.id },
            { userAId: user.id, userBId: viewerId },
          ],
        },
      }),
      db.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: viewerId, receiverId: user.id } },
      }),
      db.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: user.id, receiverId: viewerId } },
      }),
    ]);

    let friendStatus: "none" | "pending_sent" | "pending_received" | "friends" = "none";
    if (friendship) friendStatus = "friends";
    else if (sentReq?.status === "pending") friendStatus = "pending_sent";
    else if (recvReq?.status === "pending") friendStatus = "pending_received";

    return NextResponse.json({
      result: {
        id: user.id,
        username: user.username,
        image: user.image,
        highScore: user.rogueStats?.highScore ?? 0,
        totalRuns: user.rogueStats?.totalRuns ?? 0,
        friendStatus,
        pendingRequestId: recvReq?.id ?? null, // so receiver can accept inline
      },
    });
  } catch (err) {
    console.error("[friends/search] GET error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
