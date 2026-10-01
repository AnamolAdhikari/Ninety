import { readFile, writeFile } from "node:fs/promises";

const path = "dist/server/wrangler.json";
const raw = await readFile(path, "utf8");
const config = JSON.parse(raw);

// Cloudflare Worker Previews do not inherit production bindings. NINETY reads
// both Durable Objects through env, so declare same-worker bindings explicitly
// for Previews. Omitting script_name is intentional: Cloudflare then provisions
// isolated Durable Object namespaces/storage for each Preview.
config.previews = {
  ...(config.previews ?? {}),
  durable_objects: {
    ...((config.previews ?? {}).durable_objects ?? {}),
    bindings: [
      { name: "MATCH_PRESENCE", class_name: "MatchPresence" },
      { name: "NINETY_ACCOUNTS", class_name: "NinetyAccounts" },
    ],
  },
  ratelimits: [
    { name: "LOGIN_RATE_LIMITER", namespace_id: "90002", simple: { limit: 5, period: 60 } },
  ],
};

await writeFile(path, JSON.stringify(config, null, 2) + "\n");
