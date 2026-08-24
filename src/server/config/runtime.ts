import "server-only";

export function developmentRoutesEnabled(env: Readonly<Record<string, string | undefined>> = process.env) { return env.NODE_ENV !== "production"; }
