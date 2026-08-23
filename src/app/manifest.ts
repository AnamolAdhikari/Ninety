import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "NINETY", short_name: "NINETY", description: "Live football, fixtures, clubs and match coverage.", start_url: "/", scope: "/", display: "standalone", background_color: "#080a0d", theme_color: "#080a0d", orientation: "any", categories: ["sports"], icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }, { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }] };
}
