import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NINETY — Football, beautifully covered", description: "Live scores, fixtures, stories and the moments that define football." };
export const viewport: Viewport = { colorScheme: "dark", themeColor: "#080a0d" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body>{children}</body></html>; }
