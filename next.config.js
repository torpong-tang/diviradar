/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  basePath: basePath || undefined,
  output: process.env.STANDALONE === "true" ? "standalone" : undefined
};

module.exports = nextConfig;
