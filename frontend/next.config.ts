import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(process.cwd(), "..") })
};

export default nextConfig;
