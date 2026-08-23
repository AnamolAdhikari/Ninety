import { describe, expect, it } from "vitest";
import type { StreamOption } from "@/domain/stream/types";
import { nextUntriedStream, orderStreams } from "./stream-selection";
const streams: StreamOption[] = [{ id: "sd", hd: false }, { id: "spanish", language: "Spanish", hd: true }, { id: "english", language: "English", hd: true }];
describe("stream selection", () => { it("prefers a stored valid choice, then English HD", () => { expect(orderStreams(streams, "spanish")[0].id).toBe("spanish"); expect(orderStreams(streams)[0].id).toBe("english"); }); it("fails over once per untried stream", () => { expect(nextUntriedStream(streams, new Set(["sd", "spanish"]))?.id).toBe("english"); expect(nextUntriedStream(streams, new Set(streams.map((stream) => stream.id)))).toBeUndefined(); }); });
