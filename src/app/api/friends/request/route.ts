// src/app/api/friends/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const senderId = session.user.id;
    const body = await req.json();
    const receiverId: string | undefined = body.receiverId;

    if (!receiverId || typeof receiverId !== "string") {
      return NextResponse.json({ error: "receiverId required" }, { status: 400 });
    }

    if (senderId === receiverId) {
      return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check not already friends
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: receiverId },
          { userAId: receiverId, userBId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }

    // Check if receiver already sent a request → auto-accept
    const reverseRequest = await db.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: receiverId, receiverId: senderId } },
    });

    if (reverseRequest?.status === "pending") {
      // Auto-accept: create friendship + mark both requests accepted
      const [friendship] = await db.$transaction([
        db.friendship.create({
          data: { userAId: senderId, userBId: receiverId },
        }),
        db.friendRequest.update({
          where: { id: reverseRequest.id },
          data: { status: "accepted" },
        }),
      ]);
      return NextResponse.json({ status: "friends", friendship });
    }

    // Create or return existing pending request
    const request = await db.friendRequest.upsert({
      where: { senderId_receiverId: { senderId, receiverId } },
      create: { senderId, receiverId, status: "pending" },
      update: { status: "pending" }, // reactivate if previously rejected
    });

    return NextResponse.json({ status: "pending_sent", request });
  } catch (err) {
    console.error("[friends/request] POST error:", err);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
