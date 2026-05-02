// src/app/api/friends/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: friendId } = await params;

    if (!friendId) {
      return NextResponse.json({ error: "Friend user ID required" }, { status: 400 });
    }

    // Find the friendship record (bidirectional — either side could be userA)
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: friendId },
          { userAId: friendId, userBId: userId },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    // Delete friendship + clean up any stale request records between the pair
    await db.$transaction([
      db.friendship.delete({ where: { id: friendship.id } }),
      db.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId },
          ],
        },
      }),
    ]);

    return NextResponse.json({ status: "removed" });
  } catch (err) {
    console.error("[friends/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
