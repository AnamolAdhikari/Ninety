import type { NextConfig } from "next";
import { createSecurityHeaders } from "./src/server/security/headers";

const embedOrigins = (process.env.FOOTBALL_EMBED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean).flatMap((value) => { try { const url = new URL(value); return url.protocol === "https:" ? [url.origin] : []; } catch { return []; } });
const imageOrigins = process.env.FOOTBALL_PROVIDER_BASE_URL ? (() => { try { const url = new URL(process.env.FOOTBALL_PROVIDER_BASE_URL!); return url.protocol === "https:" ? [url.origin] : []; } catch { return []; } })() : [];
const remotePatterns = imageOrigins.map((origin) => new URL(`${origin}/**`));
const production = process.env.NODE_ENV === "production";
const allowedDevOrigins = (process.env.NINETY_ALLOWED_DEV_ORIGINS ?? "192.168.1.10").split(",").map((origin) => origin.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  images: { remotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: createSecurityHeaders(production, embedOrigins, imageOrigins) }];
  },
};

export default nextConfig;
