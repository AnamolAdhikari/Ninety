import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#080a0d", color: "#f5f7f8", fontSize: 118, fontWeight: 900, letterSpacing: "-10px", border: "18px solid #c7ff4a" }}>90<span style={{ color: "#c7ff4a" }}>.</span></div>, size); }
