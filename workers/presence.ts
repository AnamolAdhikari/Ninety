import { DurableObject } from "cloudflare:workers";

// Only short-lived random browser/tab IDs are stored; no account, IP, or playback data.
export class MatchPresence extends DurableObject {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS visitors (tab TEXT PRIMARY KEY, visitor TEXT NOT NULL, expires INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL)");
  }
  async fetch(request: Request) {
    const { visitor, tab, leave } = await request.json() as {visitor:string;tab:string;leave?:boolean};
    const now=Date.now(),sql=this.ctx.storage.sql;
    sql.exec("DELETE FROM visitors WHERE expires <= ?",now);
    if(leave)sql.exec("DELETE FROM visitors WHERE tab = ? AND visitor = ?",tab,visitor);
    else {
      const size=sql.exec<{total:number}>("SELECT COUNT(*) AS total FROM visitors").one().total;
      if(size>=5000)return new Response(null,{status:503});
      sql.exec("INSERT INTO visitors (tab, visitor, expires) VALUES (?, ?, ?) ON CONFLICT(tab) DO UPDATE SET visitor=excluded.visitor, expires=excluded.expires",tab,visitor,now+75000);
    }
    const count=sql.exec<{total:number}>("SELECT COUNT(DISTINCT visitor) AS total FROM visitors WHERE expires > ?",now).one().total;
    const currentPeak=sql.exec<{value:number}|null>("SELECT value FROM stats WHERE key = 'peak'").one()?.value ?? 0;
    const peak=Math.max(currentPeak,count);
    if(peak!==currentPeak)sql.exec("INSERT INTO stats (key, value) VALUES ('peak', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",peak);
    if(count && await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(now+75000);
    return Response.json({count,peak},{headers:{"Cache-Control":"no-store"}});
  }
  async alarm() {
    this.ctx.storage.sql.exec("DELETE FROM visitors WHERE expires <= ?",Date.now());
    const next=this.ctx.storage.sql.exec<{expires:number|null}>("SELECT MIN(expires) AS expires FROM visitors").one().expires;
    if(next)await this.ctx.storage.setAlarm(next);
  }
}
