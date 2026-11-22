// Better Auth inside Express: email + password, database sessions.
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { AUTH_RATE_LIMIT, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "shared/constants/auth";
import { env } from "../config/env.js";

// Better Auth's own small connection pool (the driver connects on first use); closed on shutdown.
export const authMongoClient = new MongoClient(env.MONGODB_URI);

const signInLimit = { window: AUTH_RATE_LIMIT.windowSeconds, max: AUTH_RATE_LIMIT.max };

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: mongodbAdapter(authMongoClient.db(), {
    client: authMongoClient,
    transaction: env.MONGODB_TRANSACTIONS,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
  },
  rateLimit: {
    // Tests create many users quickly; every other environment is limited.
    enabled: env.NODE_ENV !== "test",
    customRules: { "/sign-in/email": signInLimit, "/sign-up/email": signInLimit },
  },
  telemetry: { enabled: false },
});
