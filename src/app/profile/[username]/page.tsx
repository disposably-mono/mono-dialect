// src/app/profile/[username]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import NavWrapper from "@/components/nav/NavWrapper";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
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
      dailyStats: {
        select: {
          currentStreak: true,
          longestStreak: true,
          gamesPlayed: true,
          gamesWon: true,
          guessDist: true,
        },
      },
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

  if (!user || !user.username) notFound();

  // Friend status
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

    if (friendship) friendStatus = "friends";
    else if (sentReq?.status === "pending") friendStatus = "pending_sent";
    else if (recvReq?.status === "pending") {
      friendStatus = "pending_received";
      pendingRequestId = recvReq.id;
    }
  }

  // Global rank
  const usersAbove = await db.rogueStats.count({
    where: { highScore: { gt: user.rogueStats?.highScore ?? 0 } },
  });
  const globalRank = (user.rogueStats?.highScore ?? 0) > 0 ? usersAbove + 1 : null;

  // Win rate
  const winRate =
    (user.dailyStats?.gamesPlayed ?? 0) > 0
      ? Math.round(((user.dailyStats?.gamesWon ?? 0) / user.dailyStats!.gamesPlayed) * 100)
      : 0;

  // Friends list
  const friendships = await db.friendship.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    select: {
      userA: { select: { id: true, username: true, image: true, rogueStats: { select: { highScore: true } } } },
      userB: { select: { id: true, username: true, image: true, rogueStats: { select: { highScore: true } } } },
    },
  });

  const friends = friendships.map((f) =>
    f.userA.id === user.id ? f.userB : f.userA
  );

  return (
    <>
      <NavWrapper />
      <ProfileClient
        profile={{
          id: user.id,
          username: user.username,
          image: user.image,
          joinedAt: user.createdAt.toISOString(),
          isYou: viewerId === user.id,
          isAuthenticated: !!viewerId,
          friendStatus,
          pendingRequestId,
          globalRank,
          daily: {
            currentStreak: user.dailyStats?.currentStreak ?? 0,
            longestStreak: user.dailyStats?.longestStreak ?? 0,
            gamesPlayed: user.dailyStats?.gamesPlayed ?? 0,
            gamesWon: user.dailyStats?.gamesWon ?? 0,
            winRate,
            guessDist: (user.dailyStats?.guessDist ?? {}) as Record<string, number>,
          },
          rogue: {
            highScore: user.rogueStats?.highScore ?? 0,
            totalRuns: user.rogueStats?.totalRuns ?? 0,
            totalRounds: user.rogueStats?.totalRounds ?? 0,
            totalScore: user.rogueStats?.totalScore ?? 0,
          },
        }}
        friends={friends.map((f) => ({
          id: f.id,
          username: f.username!,
          image: f.image,
          highScore: f.rogueStats?.highScore ?? 0,
        }))}
      />
    </>
  );
}
