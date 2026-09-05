import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["public/downloads/**", "./public/downloads/**", "public/downloads"],
  },
};

export default nextConfig;

