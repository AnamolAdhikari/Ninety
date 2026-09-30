import handler from "vinext/server/fetch-handler";
import { authenticate, type AuthEnv } from "./auth";
export { MatchPresence } from "./presence";
export default {
  async fetch(request: Request, env: AuthEnv, ctx: ExecutionContext) {
    const blocked = await authenticate(request, env);
    if (blocked) return blocked;
    const response = await handler.fetch(request, env, ctx);
    const protectedResponse = new Response(response.body, response);
    protectedResponse.headers.set("Cache-Control", "private, no-store");
    return protectedResponse;
  },
};
