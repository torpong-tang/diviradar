/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" ? "standalone" : undefined
};

module.exports = nextConfig;
