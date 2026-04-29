import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { profiles, user, session, account, verification } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 6,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: u, url }) => {
      await sendEmail({
        to: u.email,
        subject: "Verify your Sadhana account",
        html: `
          <p>Welcome to Sadhana.</p>
          <p>Click the link below to verify your email and begin your daily practice:</p>
          <p><a href="${url}">Verify your email</a></p>
          <p>If you didn't sign up, ignore this email.</p>
        `,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(profiles).values({
            id: createdUser.id,
            displayName: createdUser.name,
          });
        },
      },
    },
  },
});
