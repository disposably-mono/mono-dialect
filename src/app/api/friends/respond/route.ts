// src/app/api/friends/respond/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { requestId, action }: { requestId?: string; action?: "accept" | "reject" } = body;

    if (!requestId || !action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "requestId and action (accept|reject) required" }, { status: 400 });
    }

    // Find the request and verify the current user is the receiver
    const request = await db.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.receiverId !== userId) {
      return NextResponse.json({ error: "Not authorized to respond to this request" }, { status: 403 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already responded to" }, { status: 409 });
    }

    if (action === "accept") {
      await db.$transaction([
        db.friendRequest.update({
          where: { id: requestId },
          data: { status: "accepted" },
        }),
        db.friendship.create({
          data: { userAId: request.senderId, userBId: request.receiverId },
        }),
      ]);
      return NextResponse.json({ status: "friends" });
    }

    // Reject
    await db.friendRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
    });

    return NextResponse.json({ status: "rejected" });
  } catch (err) {
    console.error("[friends/respond] POST error:", err);
    return NextResponse.json({ error: "Failed to respond to request" }, { status: 500 });
  }
}
