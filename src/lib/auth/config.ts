import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Check if user needs OTP verification
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // New user - will need OTP verification
          return true;
        }

        // Existing user - check if email is verified
        if (!existingUser.emailVerified) {
          return '/auth/verify-otp';
        }

        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Fetch additional user data
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            uniqueUserId: true,
            displayName: true,
            emailVerified: true,
          },
        });
        if (dbUser) {
          token.uniqueUserId = dbUser.uniqueUserId;
          token.displayName = dbUser.displayName;
          token.emailVerified = !!dbUser.emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.uniqueUserId = token.uniqueUserId as string;
        session.user.displayName = token.displayName as string | null;
        session.user.emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Update last active timestamp
      await db.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    },
    async signIn({ user }) {
      // Update last active timestamp on each sign in
      await db.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

