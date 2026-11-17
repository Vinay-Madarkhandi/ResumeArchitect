import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old v1 routes, kept working for bookmarks.
  async redirects() {
    return [
      { source: "/library", destination: "/dashboard", permanent: true },
      { source: "/new-tailoring", destination: "/new", permanent: true },
      { source: "/resumes/:id/edit", destination: "/resumes/:id", permanent: true },
      { source: "/resumes/:id/export", destination: "/resumes/:id", permanent: true },
    ];
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
