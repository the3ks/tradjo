import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  decode as defaultDecode,
  encode as defaultEncode
} from "@auth/core/jwt";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_REMEMBERED = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE_BROWSER = 12 * 60 * 60;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_REMEMBERED
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_REMEMBERED,
    async encode(params) {
      return defaultEncode({
        ...params,
        maxAge:
          params.token?.rememberMe === false
            ? SESSION_MAX_AGE_BROWSER
            : SESSION_MAX_AGE_REMEMBERED
      });
    },
    decode: defaultDecode
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() }
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          rememberMe: parsed.data.rememberMe !== "false"
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.rememberMe = user.rememberMe;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      session.rememberMe = token.rememberMe !== false;

      return session;
    }
  }
});
