import type { MetadataRoute } from "next";
const origin = process.env.NINETY_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/live", "/matches", "/leagues"].map((path, index) => ({ url: `${origin}${path || "/"}`, changeFrequency: path === "/live" ? "hourly" as const : "daily" as const, priority: index === 0 ? 1 : .8 })); }
