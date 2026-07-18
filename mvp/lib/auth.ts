import NextAuth from "next-auth";
import authConfig from "./auth.config";

import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // keep yours
  },
});