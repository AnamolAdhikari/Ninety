import { describe, expect, it } from "vitest";
import manifest from "./manifest";
describe("PWA manifest", () => { it("is installable with NINETY branding", () => expect(manifest()).toMatchObject({ name: "NINETY", short_name: "NINETY", display: "standalone", start_url: "/", theme_color: "#080a0d" })); });
