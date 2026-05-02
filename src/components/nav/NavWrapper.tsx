// src/components/nav/NavWrapper.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "./Nav";
import { AuthControls } from "./AuthControls";
import Link from "next/link";

export default async function NavWrapper() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let username: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    username = user?.username ?? null;
  }

  const authSlot = session?.user ? (
    <AuthControls username={username} userId={userId} />
  ) : (
    <Link
      href="/api/auth/signin"
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: "var(--graphite, #34312D)",
        background: "var(--beige, #EAF0CE)",
        padding: "5px 14px",
        borderRadius: 6,
        textDecoration: "none",
      }}
    >
      Sign in
    </Link>
  );

  return <Nav username={username} authSlot={authSlot} />;
}
