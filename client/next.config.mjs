// The browser only ever talks to this Next.js app. /api/v1/* and /api/auth/* are forwarded to Express,
// so everything is one domain and the session cookie is first-party.
const apiUrl =
  process.env.API_URL ??
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:4000");
if (!apiUrl) throw new Error("API_URL is not set (see client/.env.example)");

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The rewrite proxy's default 30 s timeout cuts off AI requests (60 s each + one retry, server/src/lib/ai.js).
    proxyTimeout: 130_000,
  },
  // shared/ is plain source code, so Next.js compiles it like our own files.
  transpilePackages: ["shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` },
      { source: "/api/auth/:path*", destination: `${apiUrl}/api/auth/:path*` },
    ];
  },
};

export default nextConfig;
