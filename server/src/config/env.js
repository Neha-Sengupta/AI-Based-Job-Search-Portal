// Every environment variable the server uses, validated at start-up.
// Keep server/.env.example in sync with this schema.
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  APP_URL: z.url({ protocol: /^https?$/ }),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "Must be a MongoDB connection string"),
  // Transactions need a replica set: true on Atlas, false for a local single-server MongoDB.
  MONGODB_TRANSACTIONS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  BETTER_AUTH_SECRET: z.string().min(32, "Must be at least 32 characters"),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  INTERNAL_API_KEY: z.string().min(32, "Must be at least 32 characters"),
  JOB_SOURCES: z
    .string()
    .default("fixtures")
    .transform((value) =>
      value
        .split(",")
        .map((source) => source.trim())
        .filter(Boolean),
    ),
  JOB_IMPORT_MAX_PER_SOURCE: z.coerce.number().int().min(0).default(50),
  JOB_COMPANIES_FILE: z.string().default("companies.dev.json"),
  // AI drafts application answers only. Empty AI_BASE_URL = AI turned off (the feature says so).
  AI_BASE_URL: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).default(""),
  AI_API_KEY: z.string().default(""),
  AI_MODEL: z.string().default(""),
  AI_DAILY_LIMIT: z.coerce.number().int().min(0).default(20),
});

export function parseEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Names and reasons only: never print the values, they may be secrets.
    const problems = result.error.issues.map(
      (issue) => `  ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables:\n${problems.join("\n")}`);
  }
  return result.data;
}

function loadEnv() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    // The logger isn't available yet (it needs env), so write straight to stderr and stop.
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

export const env = loadEnv();
