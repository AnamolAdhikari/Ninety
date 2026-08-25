import type { Team } from "./types";

const connectors = new Set(["a", "and", "at", "de", "del", "fc", "cf", "afc", "sc", "the"]);

export const visualIdentityKey = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function deterministicInitials(name: string, preferred?: string) {
  const explicit = preferred?.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (explicit && explicit.length <= 3) return explicit;
  const words = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/i).filter((word) => word && !connectors.has(word.toLowerCase()));
  if (!words.length) return "FC";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

export const isTrustedVisualSource = (value?: string) => {
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

// Kept intentionally small: local artwork is used only when it is maintained in the repository.
const localTeamCrests: Readonly<Record<string, string>> = {};

export function resolveTeamVisualIdentity(team: Team) {
  const key = visualIdentityKey(team.slug || team.name);
  return {
    displayName: team.name,
    key,
    sources: [isTrustedVisualSource(team.crestUrl) ? team.crestUrl : undefined, localTeamCrests[key]],
    fallbackInitials: deterministicInitials(team.name, team.shortName),
  };
}

