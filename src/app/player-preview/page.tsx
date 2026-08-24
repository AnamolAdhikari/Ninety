import { notFound } from "next/navigation";
import { developmentRoutesEnabled } from "@/server/config/runtime";
export const metadata = { robots: { index: false, follow: false } };
export default async function PlayerPreview({ searchParams }: PageProps<"/player-preview">) { if (!developmentRoutesEnabled()) notFound(); const { source } = await searchParams; return <main className="grid min-h-screen place-items-center bg-black text-center text-white"><div><div className="mx-auto h-2 w-2 animate-pulse rounded-full bg-[#c7ff4a]"/><p className="mt-4 text-sm font-semibold">Authorized player preview</p><p className="mt-1 text-xs text-white/40">Mock {typeof source === "string" ? source : "stream"} source loaded</p></div></main>; }
