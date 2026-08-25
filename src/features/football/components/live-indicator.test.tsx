import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveIndicator } from "./live-indicator";
describe("LiveIndicator", () => { it("renders an accessible red broadcast state", () => { const html = renderToStaticMarkup(<LiveIndicator minute={67}/>); expect(html).toContain("Live · 67′"); expect(html).toContain("bg-[#ff4054]"); expect(html).toContain("live-dot"); }); });
