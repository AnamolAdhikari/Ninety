export function createContentSecurityPolicy(embedOrigins: string[] = [], development = false, imageOrigins: string[] = []) {
  const script = ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])];
  const frames = ["'self'", ...embedOrigins];
  return [
    "default-src 'self'", `script-src ${script.join(" ")}`, "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", "data:", "blob:", ...imageOrigins].join(" ")}`, "font-src 'self' data:", "connect-src 'self'",
    `frame-src ${frames.join(" ")}`, "frame-ancestors 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'", "manifest-src 'self'", "worker-src 'self' blob:",
  ].join("; ");
}
