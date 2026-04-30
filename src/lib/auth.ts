// src/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapterManual } from "@/lib/auth-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  // ── FIXED: wire the adapter so createUser + linkAccount actually run ──────
  // Auth.js needs the adapter present to persist users and accounts even when
  // using JWT sessions. Without it, nothing is ever written to the DB.
  adapter: PrismaAdapterManual(),

  session: {
    strategy: "jwt",
  },

  pages: {
    newUser: "/onboarding", // now works — adapter lets Auth.js detect new users
  },

  callbacks: {
    async jwt({ token, account, user }) {
      // ── FIXED: on first sign-in, Auth.js passes the created `user` object
      //    directly into this callback — no DB lookup needed. Use it directly.
      //    Previously this did a findUnique that always returned null because
      //    createUser had never been called.
      if (account && user) {
        token.id = user.id;
        // username is null at this point for new users — that's correct.
        // It gets set after onboarding. The session callback reads it from
        // the token, and the next sign-in will pick it up via the lookup below.
        token.username = (user as { username?: string | null }).username ?? null;
      }

      // ── On subsequent sign-ins (account is absent), re-fetch username from
      //    DB in case it was set during onboarding since the last token issue.
      if (!account && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { username: true },
        });
        token.username = dbUser?.username ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.username) {
        (session.user as { username?: string }).username = token.username as string;
      }
      return session;
    },
  },
});
