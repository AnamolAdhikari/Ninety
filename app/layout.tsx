import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "NINETY Live — Football, live and reliable", description: "Live football matches with secure embedded playback and automatic source discovery.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" }, other: { "ninety-release": "release-12" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
