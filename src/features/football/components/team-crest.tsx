import type { Team } from "@/domain/football/types";

export function TeamCrest({ team, size = "medium" }: { team: Team; size?: "small" | "medium" | "large" }) {
  const backgroundImage = team.crestUrl ? `url("${team.crestUrl.replace(/["\\]/g, "")}")` : `linear-gradient(145deg, ${team.colors[0]}, ${team.colors[1]})`;
  const sizes = { small: "h-10 w-10 text-[11px]", medium: "h-16 w-16 text-sm", large: "h-22 w-22 text-lg sm:h-28 sm:w-28 sm:text-xl" };
  return <div className={`grid shrink-0 place-items-center rounded-[30%] border border-white/15 bg-contain bg-center bg-no-repeat font-black text-white shadow-xl ${sizes[size]}`} style={{ backgroundImage }} aria-label={`${team.name} crest`}>{!team.crestUrl && <span className="rounded bg-black/25 px-1.5 py-1 backdrop-blur">{team.shortName}</span>}</div>;
}
