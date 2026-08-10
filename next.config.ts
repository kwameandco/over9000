import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export — no server, ever. Deploys as plain files (Netlify `out/`).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
