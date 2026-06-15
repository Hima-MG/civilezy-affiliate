/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverActions is stable in Next.js 15 — no experimental block needed.
  // The old allowedOrigins: ["localhost:3000"] has been removed:
  //   • this app uses REST API routes, not Server Actions
  //   • it only whitelisted localhost, blocking production deployments
};

module.exports = nextConfig;
