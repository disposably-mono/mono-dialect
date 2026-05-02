// src/lib/auth-adapter.ts
// Manual Auth.js v5 adapter for Prisma 7
// Replaces @auth/prisma-adapter which does not support Prisma 7

import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";

export function PrismaAdapterManual(): Adapter {
  return {
    // ── Users ──────────────────────────────────────────────────────────────
    async createUser(data) {
      const user = await db.user.create({
        data: {
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
        },
      });
      return { ...user, email: user.email!, emailVerified: user.emailVerified ?? null };
    },

    async getUser(id) {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return null;
      return { ...user, email: user.email!, emailVerified: user.emailVerified ?? null };
    },

    async getUserByEmail(email) {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;
      return { ...user, email: user.email!, emailVerified: user.emailVerified ?? null };
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await db.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      if (!account) return null;
      return {
        ...account.user,
        email: account.user.email!,
        emailVerified: account.user.emailVerified ?? null,
      };
    },

    async updateUser(data) {
      const user = await db.user.update({
        where: { id: data.id },
        data: {
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
        },
      });
      return { ...user, email: user.email!, emailVerified: user.emailVerified ?? null };
    },

    async deleteUser(id) {
      await db.user.delete({ where: { id } });
    },

    // ── Accounts ───────────────────────────────────────────────────────────
    async linkAccount(data) {
      await db.account.create({
        data: {
          userId:            data.userId,
          type:              data.type,
          provider:          data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token:     data.refresh_token ?? null,
          access_token:      data.access_token ?? null,
          expires_at:        data.expires_at ?? null,
          token_type:        data.token_type ?? null,
          scope:             data.scope ?? null,
          id_token:          data.id_token ?? null,
          session_state:     data.session_state ? String(data.session_state) : null,
        },
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },

    // ── Sessions ───────────────────────────────────────────────────────────
    async createSession(data) {
      return db.session.create({ data });
    },

    async getSessionAndUser(sessionToken) {
      const session = await db.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!session) return null;
      return {
        session,
        user: {
          ...session.user,
          email: session.user.email!,
          emailVerified: session.user.emailVerified ?? null,
        },
      };
    },

    async updateSession(data) {
      return db.session.update({
        where: { sessionToken: data.sessionToken },
        data,
      });
    },

    async deleteSession(sessionToken) {
      await db.session.delete({ where: { sessionToken } });
    },

    // ── Verification tokens ────────────────────────────────────────────────
    async createVerificationToken(data) {
      return db.verificationToken.create({ data });
    },

    async useVerificationToken({ identifier, token }) {
      try {
        return await db.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
      } catch {
        return null;
      }
    },
  };
}
