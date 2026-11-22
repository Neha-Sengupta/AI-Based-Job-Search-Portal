import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["shared/**/*.test.js", "server/**/*.test.js", "client/src/**/*.test.js"],
    environment: "node",
    env: {
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      MONGODB_URI: "mongodb://127.0.0.1:27017/jobportal-test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      BETTER_AUTH_URL: "http://localhost:4000",
      INTERNAL_API_KEY: "test-internal-key-test-internal-key-1234",
      JOB_SOURCES: "fixtures",
    },
  },
});
