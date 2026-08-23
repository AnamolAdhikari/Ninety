import type { NextConfig } from "next";
import { createContentSecurityPolicy } from "./src/server/security/content-security-policy";

const embedOrigins = (process.env.FOOTBALL_EMBED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean).flatMap((value) => { try { const url = new URL(value); return url.protocol === "https:" ? [url.origin] : []; } catch { return []; } });
const imageOrigins = process.env.FOOTBALL_PROVIDER_BASE_URL ? (() => { try { const url = new URL(process.env.FOOTBALL_PROVIDER_BASE_URL!); return url.protocol === "https:" ? [url.origin] : []; } catch { return []; } })() : [];
const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: createContentSecurityPolicy(embedOrigins, !production, imageOrigins) },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }];
  },
};

export default nextConfig;
