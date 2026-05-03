// src/app/leaderboard/page.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import NavWrapper from "@/components/nav/NavWrapper";
import LeaderboardClient from "./LeaderboardClient";

export const revalidate = 60;

type UserRow = {
  id: string;
  username: string | null;
  image: string | null;
  rogueStats: {
    highScore: number;
    totalRuns: number;
    totalRounds: number;
    totalScore: number;
  } | null;
};

type FriendshipRow = { userAId: string; userBId: string };

export default async function LeaderboardPage() {
  // Run auth + global leaderboard fetch in parallel
  const [session, users] = await Promise.all([
    auth(),
    db.user.findMany({
      where: {
        username:   { not: null },
        rogueStats: { isNot: null },
      },
      select: {
        id: true,
        username: true,
        image: true,
        rogueStats: {
          select: {
            highScore:   true,
            totalRuns:   true,
            totalRounds: true,
            totalScore:  true,
          },
        },
      },
      orderBy: { rogueStats: { highScore: "desc" } },
      take: 100,
    }),
  ]);

  const userId = session?.user?.id ?? null;

  const globalEntries = users
    .filter((u: UserRow) => u.rogueStats && u.rogueStats.highScore > 0)
    .map((u: UserRow, i: number) => ({
      rank:        i + 1,
      userId:      u.id,
      username:    u.username!,
      image:       u.image,
      isYou:       u.id === userId,
      highScore:   u.rogueStats!.highScore,
      totalRuns:   u.rogueStats!.totalRuns,
      totalRounds: u.rogueStats!.totalRounds,
      totalScore:  u.rogueStats!.totalScore,
    }));

  // Auth-dependent data in parallel
  let pendingCount  = 0;
  let friendEntries: typeof globalEntries = [];

  if (userId) {
    const [friendships, pending] = await Promise.all([
      db.friendship.findMany({
        where:  { OR: [{ userAId: userId }, { userBId: userId }] },
        select: { userAId: true, userBId: true },
      }),
      db.friendRequest.count({
        where: { receiverId: userId, status: "pending" },
      }),
    ]);

    pendingCount = pending;
    const friendIds = friendships.map((f: FriendshipRow) =>
      f.userAId === userId ? f.userBId : f.userAId
    );

    // Fetch friend stats in parallel with already-complete global data
    const friendUsers = await db.user.findMany({
      where:   { id: { in: [userId, ...friendIds] }, username: { not: null } },
      select: {
        id: true, username: true, image: true,
        rogueStats: {
          select: { highScore: true, totalRuns: true, totalRounds: true, totalScore: true },
        },
      },
      orderBy: { rogueStats: { highScore: "desc" } },
    });

    friendEntries = friendUsers.map((u: UserRow, i: number) => ({
      rank:        i + 1,
      userId:      u.id,
      username:    u.username!,
      image:       u.image,
      isYou:       u.id === userId,
      highScore:   u.rogueStats?.highScore   ?? 0,
      totalRuns:   u.rogueStats?.totalRuns   ?? 0,
      totalRounds: u.rogueStats?.totalRounds ?? 0,
      totalScore:  u.rogueStats?.totalScore  ?? 0,
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
