/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dnd/db", "@dnd/env", "@dnd/types", "@dnd/ui"],
  typedRoutes: true,
};

export default nextConfig;

