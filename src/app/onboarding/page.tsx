// src/app/onboarding/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();

  // Not signed in at all — back to home
  if (!session?.user) redirect("/");

  // Already has a username — skip onboarding
  if ((session.user as any).username) redirect("/");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <OnboardingForm userId={session.user.id!} />
    </main>
  );
}
