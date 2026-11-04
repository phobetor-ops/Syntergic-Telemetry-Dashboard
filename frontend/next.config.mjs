/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: false,
  output: isGitHubPages ? "export" : "standalone",
  basePath: isGitHubPages ? "/Syntergic-Telemetry-Dashboard" : "",
  assetPrefix: isGitHubPages ? "/Syntergic-Telemetry-Dashboard/" : undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
