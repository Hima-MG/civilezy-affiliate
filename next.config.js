const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Point the output file tracer at the actual project root to silence the
  // "multiple lockfiles detected" warning that appears when the project is
  // nested inside a parent directory that also has a package-lock.json.
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // serverActions is stable in Next.js 15 — no experimental block needed.
  // The old allowedOrigins: ["localhost:3000"] has been removed:
  //   • this app uses REST API routes, not Server Actions
  //   • it only whitelisted localhost, breaking production deployments
};

module.exports = nextConfig;
