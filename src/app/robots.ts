import type { MetadataRoute } from "next";
const origin = process.env.NINETY_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/player-preview", "/offline"] }, sitemap: `${origin}/sitemap.xml`, host: origin }; }
