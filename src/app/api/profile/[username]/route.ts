// src/app/api/profile/[username]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();
    const viewerId = session?.user?.id ?? null;

    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        image: true,
        createdAt: true,
        rogueStats: {
          select: {
            highScore: true,
            totalRuns: true,
            totalRounds: true,
            totalScore: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Friendship status between viewer and this profile
    let friendStatus: "none" | "pending_sent" | "pending_received" | "friends" = "none";
    let pendingRequestId: string | null = null;

    if (viewerId && viewerId !== user.id) {
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

      if (friendship) {
        friendStatus = "friends";
      } else if (sentReq?.status === "pending") {
        friendStatus = "pending_sent";
      } else if (recvReq?.status === "pending") {
        friendStatus = "pending_received";
        pendingRequestId = recvReq.id;
      }
    }

    // Compute global rank
    const usersAbove = await db.rogueStats.count({
      where: { highScore: { gt: user.rogueStats?.highScore ?? 0 } },
    });
    const globalRank = (user.rogueStats?.highScore ?? 0) > 0 ? usersAbove + 1 : null;

    return NextResponse.json({
      profile: {
        id: user.id,
        username: user.username,
        image: user.image,
        joinedAt: user.createdAt,
        isYou: viewerId === user.id,
        isAuthenticated: viewerId !== null,
        friendStatus,
        pendingRequestId,
        globalRank,
        rogue: {
          highScore: user.rogueStats?.highScore ?? 0,
          totalRuns: user.rogueStats?.totalRuns ?? 0,
          totalRounds: user.rogueStats?.totalRounds ?? 0,
          totalScore: user.rogueStats?.totalScore ?? 0,
        },
      },
    });
  } catch (err) {
    console.error("[profile] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
