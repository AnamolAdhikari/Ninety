import { env } from "cloudflare:workers";
import { accounts, type AccountEnv } from "../workers/accounts";
export async function recordHealth(category:string){try{await accounts(env as unknown as AccountEnv,"/health",{category});}catch{/* Monitoring must never break the match page. */}}
