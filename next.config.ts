import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ishtarcollective.blob.core.windows.net",
        pathname: "/rider-waite-tarot/**",
      },
    ],
  },
}

export default nextConfig
