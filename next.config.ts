import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
