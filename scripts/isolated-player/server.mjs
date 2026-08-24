import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const OPAQUE_ID_PATTERN = /^[a-z0-9-]{1,160}$/;

export function isOpaqueId(value) {
  return typeof value === "string" && OPAQUE_ID_PATTERN.test(value);
}

export function createIsolationHeaders(embedOrigin, imageOrigins = []) {
  const origin = new URL(embedOrigin);
  if (origin.protocol !== "https:") throw new Error("Player embed origin must use HTTPS.");
  const images = imageOrigins.map((value) => new URL(value)).filter((value) => value.protocol === "https:").map((value) => value.origin);
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src ${origin.origin}; img-src 'self' data: ${images.join(" ")}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(), payment=(), usb=(), serial=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export async function fetchNinetyApi(appOrigin, path, fetcher = fetch) {
  return fetcher(new URL(path, appOrigin), {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "application/json" },
    redirect: "error",
  });
}

export class DiagnosticPlaybackRegistry {
  constructor(ttlMs = 5 * 60_000, now = Date.now) { this.ttlMs = ttlMs; this.now = now; this.entries = new Map(); }
  register(payload) {
    const token = `playback-${randomUUID().replaceAll("-", "")}`;
    const streamId = `stream-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    this.entries.set(token, { ...payload, streamId, expiresAt: this.now() + this.ttlMs });
    return { token, streamId };
  }
  get(token) {
    const entry = this.entries.get(token);
    if (!entry || entry.expiresAt <= this.now()) { this.entries.delete(token); return null; }
    return entry;
  }
}

export function resolvePlayerRuntimeConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const playerOrigin = env.NINETY_PLAYER_ORIGIN ?? (production ? undefined : "http://127.0.0.1:3006");
  const appOrigin = env.NINETY_PLAYER_APP_ORIGIN ?? (production ? undefined : "http://localhost:3000");
  if (!playerOrigin || !appOrigin) throw new Error("Production player and application origins are required.");
  const player = new URL(playerOrigin); const app = new URL(appOrigin);
  if (production && (player.protocol !== "https:" || app.protocol !== "https:")) throw new Error("Production player origins must use HTTPS.");
  if (!production && (player.protocol !== "http:" || player.hostname !== "127.0.0.1")) throw new Error("Development player must use the loopback origin.");
  const listenPort = Number(env.NINETY_PLAYER_PORT ?? (production ? 3000 : 3006));
  if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65_535) throw new Error("Player listen port is invalid.");
  return {
    production,
    playerOrigin: player.origin,
    appOrigin: app.origin,
    embedOrigin: env.NINETY_PLAYER_EMBED_ORIGIN ?? "https://embed.st",
    imageOrigins: (env.NINETY_PLAYER_IMAGE_ORIGINS ?? "https://streamed.pk").split(",").map((value) => value.trim()).filter(Boolean),
    registrationKey: env.NINETY_PLAYER_REGISTRATION_KEY ?? "ninety-local-development",
    diagnostics: !production && env.NINETY_PLAYER_DIAGNOSTICS === "true",
    listenHost: env.NINETY_PLAYER_HOST ?? (production ? "0.0.0.0" : "127.0.0.1"),
    listenPort,
  };
}

const safeMatch = (payload) => {
  const match = payload?.match;
  if (!match || typeof match !== "object") return null;
  const team = (value) => value && typeof value === "object" ? { name: String(value.name ?? "Team"), crestUrl: typeof value.crestUrl === "string" ? value.crestUrl : undefined } : { name: "Team" };
  return {
    id: String(match.id ?? ""),
    competition: String(match.competition ?? "Football"),
    status: String(match.status ?? "UPCOMING"),
    home: team(match.home),
    away: team(match.away),
  };
};

const json = (response, status, payload) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const renderPage = (diagnostics) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NINETY live player</title><link rel="stylesheet" href="/player.css"></head><body><main><header><span class="brand">NINETY.</span><a id="back" href="#">Back to NINETY</a></header><section class="hero"><span id="live" class="live" hidden>LIVE</span><p id="competition">Football</p><div class="match"><img id="home-crest" hidden alt=""><h1 id="title">Preparing match…</h1><img id="away-crest" hidden alt=""></div></section><section class="player-shell"><div id="player" class="player"><div class="state" id="state"><div><strong id="state-title">Preparing live stream…</strong><span id="state-detail">Connecting to the best available source.</span></div></div></div><div class="player-controls"><div id="sources" class="sources"></div><div id="actions" class="actions" hidden><button id="retry" type="button">Retry</button><button id="another" type="button">Try another source</button></div></div></section><details class="guidance"><summary>Stream not starting?</summary><p>Wait a few seconds for the player to initialize. If another tab opens after pressing Play, close it and return here. Try another source or Retry if playback does not begin.</p></details>${diagnostics ? `<details class="diagnostics"><summary>Development diagnostics</summary><dl><div><dt>Isolation</dt><dd id="opener">Checking…</dd></div><div><dt>Player origin</dt><dd id="origin"></dd></div><div><dt>Stream ID</dt><dd id="stream">Not resolved</dd></div></dl></details>` : ""}</main><script src="/player.js" defer></script></body></html>`;

const css = `:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui;background:#050607;color:#f7f8f8}*{box-sizing:border-box}body{margin:0;min-width:320px;min-height:100vh;overflow-x:hidden;background:radial-gradient(circle at 50% 0,#1b2118 0,#090b0d 34%,#050607 72%)}main{width:min(1180px,100%);margin:auto;padding:clamp(18px,4vw,48px)}header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:clamp(32px,6vw,68px)}a,button{min-height:44px;border:1px solid #ffffff1c;border-radius:999px;padding:11px 17px;background:#15181c;color:#fff;text-decoration:none;font:inherit;font-weight:750;cursor:pointer}.brand{font-size:20px;font-weight:950;letter-spacing:-.05em;color:#c7ff4a}.hero>p{margin:10px 0 8px;color:#8f969e;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.16em}.match{display:flex;align-items:center;gap:16px;margin-bottom:26px}.match img{width:clamp(42px,6vw,68px);height:clamp(42px,6vw,68px);object-fit:contain}.hero h1{margin:0;font-size:clamp(25px,5vw,52px);letter-spacing:-.045em}.live{display:inline-flex;border-radius:999px;background:#ff4057;padding:6px 9px;font-size:10px;font-weight:900;letter-spacing:.12em}.player-shell{border:1px solid #ffffff12;border-radius:26px;background:#0b0d10;padding:clamp(8px,1.5vw,14px);box-shadow:0 40px 120px #000a}.player{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:18px;background:#000}.player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.state{position:absolute;inset:0;z-index:2;display:grid;place-items:center;padding:24px;text-align:center;color:#a3a8ad;background:radial-gradient(circle,#18201780,#020303 70%);pointer-events:none}.state strong,.state span{display:block}.state strong{color:#fff;font-size:clamp(16px,2vw,22px)}.state span{margin-top:8px;font-size:13px}.state.compact{inset:16px auto auto 16px;display:block;max-width:min(420px,calc(100% - 32px));border:1px solid #ffffff14;border-radius:14px;padding:12px 14px;text-align:left;background:#090b0ddd;backdrop-filter:blur(12px)}.state.compact strong{font-size:13px}.state.compact span{font-size:11px}.state[hidden]{display:none}.player-controls{display:flex;align-items:center;gap:12px;padding-top:12px}.sources{display:flex;flex:1;gap:8px;overflow-x:auto;padding:1px}.sources button{white-space:nowrap}.sources button[aria-pressed=true]{border-color:#c7ff4a80;background:#c7ff4a14;color:#c7ff4a}.actions{display:flex;gap:8px}.actions[hidden]{display:none}.guidance,.diagnostics,aside{margin-top:16px;border:1px solid #ffffff12;border-radius:18px;background:#0d1013;padding:15px 16px;color:#9ba2a9}.guidance summary,.diagnostics summary{color:#fff;font-weight:800;cursor:pointer}.guidance p{margin:10px 0 0;font-size:13px;line-height:1.6}.diagnostics dl{display:grid;gap:8px;margin-bottom:0}.diagnostics dl div{display:flex;justify-content:space-between;gap:20px}.diagnostics dt{color:#717980}.diagnostics dd{margin:0;text-align:right}aside strong{color:#fff}aside ol{margin:12px 0 0;padding-left:20px;line-height:1.65;font-size:13px}@media(max-width:700px){main{padding:16px}header{margin-bottom:36px}.match{gap:10px}.player-shell{border-radius:20px}.player{border-radius:13px}.player-controls{align-items:stretch;flex-direction:column}.sources{width:100%}.actions button{flex:1}.diagnostics dl div{display:block}.diagnostics dd{text-align:left;margin-top:3px}}`;

const script = `const params=new URLSearchParams(location.search),match=params.get('match'),playback=params.get('playback'),player=document.querySelector('#player'),state=document.querySelector('#state'),stateTitle=document.querySelector('#state-title'),stateDetail=document.querySelector('#state-detail'),sourcesElement=document.querySelector('#sources'),actions=document.querySelector('#actions'),retry=document.querySelector('#retry'),another=document.querySelector('#another');let streams=[],selectedId,timers=[];document.querySelector('#opener')?.replaceChildren(window.opener===null?'Protected':'Not protected');document.querySelector('#origin')?.replaceChildren(location.origin);document.querySelector('#back').href=playback?'${"__APP_ORIGIN__"}/dev/playback-diagnostic':'${"__APP_ORIGIN__"}/watch/'+encodeURIComponent(match||'');const short=id=>id.length>18?id.slice(0,10)+'…'+id.slice(-6):id;const clearTimers=()=>{timers.forEach(clearTimeout);timers=[]};const showState=(name,title,detail,compact=false)=>{player.dataset.state=name;stateTitle.textContent=title;stateDetail.textContent=detail;state.classList.toggle('compact',compact);state.hidden=false};const hideState=()=>{state.hidden=true};async function read(path){const response=await fetch(path,{cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error(String(response.status));return response.json()}function setCrest(id,team){const image=document.querySelector(id);if(team?.crestUrl){image.src=team.crestUrl;image.alt=team.name+' crest';image.hidden=false}}async function choose(id,retrying=false){clearTimers();selectedId=id;showState(retrying?'retrying':'source-resolved',retrying?'Retrying source…':'Source resolved','Preparing the player.');actions.hidden=true;player.querySelector('iframe')?.remove();for(const button of sourcesElement.children)button.setAttribute('aria-pressed',String(button.dataset.id===id));document.querySelector('#stream')?.replaceChildren(short(id));try{const path=playback?'/diagnostic/resolve?playback='+encodeURIComponent(playback)+'&stream='+encodeURIComponent(id):'/resolve?match='+encodeURIComponent(match)+'&stream='+encodeURIComponent(id);const data=await read(path);showState('iframe-loading','Preparing live stream…','Connecting to the best available source.');const frame=document.createElement('iframe');frame.src=data.embedUrl;frame.allow='autoplay; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='no-referrer';frame.title='Football match stream';frame.addEventListener('load',()=>{clearTimers();showState('player-ready','Player ready','If the Play button is not visible yet, wait a moment and try again.',true);actions.hidden=false;timers.push(setTimeout(hideState,4000))});player.append(frame);timers.push(setTimeout(()=>{if(player.dataset.state==='iframe-loading')showState('iframe-loading','Still connecting…','This can take a few seconds.',true)},4000));timers.push(setTimeout(()=>{if(player.dataset.state==='iframe-loading')showState('iframe-loading','Still preparing the player…','If the Play button is not visible yet, wait a moment or retry.',true)},8000))}catch{clearTimers();showState('source-failed','Playback unavailable for this source.','Retry or try another source.');actions.hidden=false}}retry.addEventListener('click',()=>{if(selectedId)choose(selectedId,true)});another.addEventListener('click',()=>{const index=streams.findIndex(item=>item.id===selectedId);const next=streams[index+1]||streams[0];if(next&&next.id!==selectedId)choose(next.id,true)});(async()=>{if(!match&&!playback){showState('unavailable','Invalid playback request','Return to NINETY and try again.');return}showState('preparing','Preparing live stream…','Connecting to the best available source.');try{const path=playback?'/diagnostic/bootstrap?playback='+encodeURIComponent(playback):'/bootstrap?match='+encodeURIComponent(match);const data=await read(path);document.querySelector('#competition').textContent=data.match.competition;document.querySelector('#title').textContent=data.match.title||data.match.home.name+' vs '+data.match.away.name;document.querySelector('#live').hidden=data.match.status!=='LIVE';setCrest('#home-crest',data.match.home);setCrest('#away-crest',data.match.away);streams=data.streams;if(!streams.length){showState('unavailable','Stream temporarily unavailable','No playable source is available right now.');return}another.hidden=streams.length<2;streams.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.dataset.id=item.id;button.textContent=(item.language||'Source '+(index+1))+(item.quality?' · '+item.quality:'');button.addEventListener('click',()=>choose(item.id));sourcesElement.append(button)});await choose(streams[0].id)}catch{showState('unavailable','Stream temporarily unavailable','Return to NINETY or retry in a moment.')}})();`;

export function createIsolatedPlayerServer({ appOrigin = "http://localhost:3000", playerOrigin = "http://127.0.0.1:3006", embedOrigin = "https://embed.st", imageOrigins = [], registrationKey = "ninety-local-development", development = true, diagnostics = false, fetcher = fetch, registry = new DiagnosticPlaybackRegistry() } = {}) {
  const isolationHeaders = createIsolationHeaders(embedOrigin, imageOrigins);
  return http.createServer(async (request, response) => {
    Object.entries(isolationHeaders).forEach(([key, value]) => response.setHeader(key, value));
    const url = new URL(request.url ?? "/", playerOrigin);
    if (url.pathname === "/") { response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); response.end(renderPage(diagnostics)); return; }
    if (url.pathname === "/player.css") { response.writeHead(200, { "Content-Type": "text/css; charset=utf-8" }); response.end(css); return; }
    if (url.pathname === "/player.js") { response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }); response.end(script.replaceAll("__APP_ORIGIN__", appOrigin)); return; }
    if (development && url.pathname === "/register" && request.method === "POST") {
      if (request.headers["x-ninety-player-key"] !== registrationKey || request.headers.origin) { json(response, 403, { error: "Forbidden." }); return; }
      try {
        const chunks = []; let size = 0;
        for await (const chunk of request) { size += chunk.length; if (size > 16_384) throw new Error("Payload too large."); chunks.push(chunk); }
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const embed = new URL(payload.embedUrl);
        if (embed.protocol !== "https:" || embed.origin !== new URL(embedOrigin).origin || typeof payload.title !== "string" || payload.title.length > 160) throw new Error("Invalid registration.");
        const { token } = registry.register({ title: payload.title, language: typeof payload.language === "string" ? payload.language.slice(0, 80) : undefined, quality: payload.quality === "HD" ? "HD" : "SD", embedUrl: embed.toString() });
        json(response, 201, { launchUrl: `${playerOrigin}/?playback=${encodeURIComponent(token)}` });
      } catch { json(response, 400, { error: "Invalid registration." }); }
      return;
    }
    if (development && (url.pathname === "/diagnostic/bootstrap" || url.pathname === "/diagnostic/resolve")) {
      const token = url.searchParams.get("playback");
      const entry = isOpaqueId(token) ? registry.get(token) : null;
      if (!entry) { json(response, 404, { error: "Invalid or expired playback request." }); return; }
      if (url.pathname === "/diagnostic/bootstrap") {
        json(response, 200, { match: { title: entry.title, competition: "Development diagnostic", status: "LIVE", home: { name: entry.title }, away: { name: "Live stream" } }, streams: [{ id: entry.streamId, language: entry.language, quality: entry.quality }] }); return;
      }
      if (url.searchParams.get("stream") !== entry.streamId) { json(response, 404, { error: "Stream unavailable." }); return; }
      json(response, 200, { embedUrl: entry.embedUrl }); return;
    }
    const matchId = url.searchParams.get("match");
    if (!isOpaqueId(matchId)) { json(response, 400, { error: "Invalid playback request." }); return; }
    try {
      if (url.pathname === "/bootstrap") {
        const [matchResponse, streamsResponse] = await Promise.all([
          fetchNinetyApi(appOrigin, `/api/football/match/${encodeURIComponent(matchId)}`, fetcher),
          fetchNinetyApi(appOrigin, `/api/football/match/${encodeURIComponent(matchId)}/streams`, fetcher),
        ]);
        if (!matchResponse.ok || !streamsResponse.ok) { json(response, 404, { error: "Match unavailable." }); return; }
        const match = safeMatch(await matchResponse.json());
        const streamPayload = await streamsResponse.json();
        const streams = Array.isArray(streamPayload?.streams) ? streamPayload.streams.filter((item) => isOpaqueId(item?.id)).map(({ id, language, quality }) => ({ id, language, quality })) : [];
        if (!match) { json(response, 502, { error: "Match unavailable." }); return; }
        json(response, 200, { match, streams }); return;
      }
      if (url.pathname === "/resolve") {
        const streamId = url.searchParams.get("stream");
        if (!isOpaqueId(streamId)) { json(response, 400, { error: "Invalid playback request." }); return; }
        const upstream = await fetchNinetyApi(appOrigin, `/api/football/match/${encodeURIComponent(matchId)}/streams/${encodeURIComponent(streamId)}`, fetcher);
        response.statusCode = upstream.status;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(await upstream.text()); return;
      }
      json(response, 404, { error: "Not found." });
    } catch { json(response, 503, { error: "Stream temporarily unavailable." }); }
  });
}

const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executedDirectly) {
  const config = resolvePlayerRuntimeConfig();
  const server = createIsolatedPlayerServer({ appOrigin: config.appOrigin, playerOrigin: config.playerOrigin, embedOrigin: config.embedOrigin, imageOrigins: config.imageOrigins, registrationKey: config.registrationKey, development: !config.production, diagnostics: config.diagnostics });
  server.listen(config.listenPort, config.listenHost, () => console.log(`NINETY isolated player ready at ${config.playerOrigin}`));
}
