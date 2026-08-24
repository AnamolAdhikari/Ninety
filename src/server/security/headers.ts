import { createContentSecurityPolicy } from "./content-security-policy";

export function createSecurityHeaders(production: boolean, embedOrigins: string[] = [], imageOrigins: string[] = []) {
  return [
    { key: "Content-Security-Policy", value: createContentSecurityPolicy(embedOrigins, !production, imageOrigins) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
  ];
}
