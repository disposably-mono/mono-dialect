// src/app/leaderboard/page.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import NavWrapper from "@/components/nav/NavWrapper";
import LeaderboardClient from "./LeaderboardClient";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Fetch global top 100
  const users = await db.user.findMany({
    where: {
      username: { not: null },
      rogueStats: { isNot: null },
    },
    select: {
      id: true,
      username: true,
      image: true,
      rogueStats: {
        select: {
          highScore: true,
          totalRuns: true,
          totalRounds: true,
          totalScore: true,
        },
      },
    },
    orderBy: { rogueStats: { highScore: "desc" } },
    take: 100,
  });

  const globalEntries = users
    .filter((u) => u.rogueStats && u.rogueStats.highScore > 0)
    .map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username!,
      image: u.image,
      isYou: u.id === userId,
      highScore: u.rogueStats!.highScore,
      totalRuns: u.rogueStats!.totalRuns,
      totalRounds: u.rogueStats!.totalRounds,
      totalScore: u.rogueStats!.totalScore,
    }));

  // Fetch pending incoming requests count for badge
  let pendingCount = 0;
  let friendEntries: typeof globalEntries = [];

  if (userId) {
    const [friendships, pending] = await Promise.all([
      db.friendship.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        select: { userAId: true, userBId: true },
      }),
      db.friendRequest.count({
        where: { receiverId: userId, status: "pending" },
      }),
    ]);

    pendingCount = pending;

    const friendIds = friendships.map((f) =>
      f.userAId === userId ? f.userBId : f.userAId
    );
    const allIds = [userId, ...friendIds];

    const friendUsers = await db.user.findMany({
      where: { id: { in: allIds }, username: { not: null } },
      select: {
        id: true,
        username: true,
        image: true,
        rogueStats: {
          select: {
            highScore: true,
            totalRuns: true,
            totalRounds: true,
            totalScore: true,
          },
        },
      },
      orderBy: { rogueStats: { highScore: "desc" } },
    });

    friendEntries = friendUsers.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username!,
      image: u.image,
      isYou: u.id === userId,
      highScore: u.rogueStats?.highScore ?? 0,
      totalRuns: u.rogueStats?.totalRuns ?? 0,
      totalRounds: u.rogueStats?.totalRounds ?? 0,
      totalScore: u.rogueStats?.totalScore ?? 0,
    }));
  }

  return (
    <>
      <NavWrapper />
      <LeaderboardClient
        globalEntries={globalEntries}
        friendEntries={friendEntries}
        isAuthenticated={!!userId}
        currentUserId={userId}
        pendingCount={pendingCount}
      />
    </>
  );
}
