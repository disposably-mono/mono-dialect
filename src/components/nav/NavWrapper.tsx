// src/components/nav/NavWrapper.tsx
import { auth } from "@/lib/auth";
import Link from "next/link";
import Nav from "./Nav";
import { AuthControls } from "./AuthControls";

export default async function NavWrapper() {
  const session = await auth();
  const user = session?.user as { id?: string; username?: string; name?: string } | undefined;

  const authSlot = user?.id ? (
    <AuthControls
      username={user.username ?? user.name}
      userId={user.id}
    />
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
        fontFamily: "var(--font-sans)",
        transition: "opacity 160ms var(--ease)",
      }}
    >
      Sign in
    </Link>
  );

  return <Nav authSlot={authSlot} />;
}