import type { Metadata } from "next";
import { LiveContent } from "@/features/discovery/components/live-content";

export const metadata: Metadata = { title: "Live Football | NINETY", description: "Watch football currently live on NINETY or see what starts next." };
export default function LivePage() { return <LiveContent/>; }
