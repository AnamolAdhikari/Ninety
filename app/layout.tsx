import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import PwaRegister from "./pwa-register";
import SessionTelemetry from "./session-telemetry";

export const metadata: Metadata = { title: "NINETY Live — Football, live and reliable", description: "Live football matches with secure embedded playback and automatic source discovery.", applicationName:"NINETY Live", manifest:"/manifest.webmanifest", icons: { icon: [{url:"/favicon.svg",type:"image/svg+xml"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"}], shortcut: "/favicon.svg", apple:"/icon-192.png" }, appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"NINETY Live"}, other: { "ninety-release": "release-29" } };
export const viewport={themeColor:"#07090d",colorScheme:"dark"};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<SessionTelemetry/><PwaRegister/><Toaster theme="dark" position="bottom-center" richColors/></body></html>; }
