import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }];
  },
};

export default nextConfig;
