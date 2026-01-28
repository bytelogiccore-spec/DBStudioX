import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tauri requires static export
  output: "export",
  distDir: "out",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
