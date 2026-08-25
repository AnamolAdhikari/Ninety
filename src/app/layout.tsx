import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/features/pwa/service-worker-registration";
import { AppHeader } from "@/features/shell/app-header";
export const metadata: Metadata = { metadataBase: new URL(process.env.NINETY_SITE_URL ?? "http://localhost:3000"), title: { default: "NINETY — Watch live football", template: "%s — NINETY" }, description: "See the best live football first and start watching in one click.", applicationName: "NINETY", manifest: "/manifest.webmanifest", alternates: { canonical: "/" }, robots: { index: true, follow: true }, openGraph: { type: "website", siteName: "NINETY", title: "NINETY — Watch live football", description: "See the best live football first and start watching in one click." }, twitter: { card: "summary", title: "NINETY — Watch live football", description: "See the best live football first and start watching in one click." } };
export const viewport: Viewport = { colorScheme: "dark", themeColor: "#080a0d", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body><a href="#main-content" className="skip-link">Skip to content</a><AppHeader/><div id="main-content" tabIndex={-1}>{children}</div><ServiceWorkerRegistration/></body></html>; }
