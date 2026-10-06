const MATCH_FEED = "https://streamed.pk";
const FALLBACK_KICKOFF = Date.parse("2026-10-06T23:00:00Z");
const MESSI_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg";

type RawMatch = {
  id?: unknown;
  title?: unknown;
  date?: unknown;
  teams?: { home?: { name?: unknown }; away?: { name?: unknown } };
  sources?: Array<{ source?: unknown; id?: unknown }>;
};

type RawStream = {
  id?: unknown;
  streamNo?: unknown;
  language?: unknown;
  hd?: unknown;
  embedUrl?: unknown;
  source?: unknown;
};

const clean = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const includesTeam = (value: string, team: string) => value.toLowerCase().includes(team);

function isTributeMatch(match: RawMatch) {
  const title = clean(match.title);
  const home = clean(match.teams?.home?.name);
  const away = clean(match.teams?.away?.name);
  const text = `${title} ${home} ${away}`.toLowerCase();
  return includesTeam(text, "argentina") && includesTeam(text, "benin");
}

async function matchData() {
  const [allResponse, liveResponse] = await Promise.all([
    fetch(`${MATCH_FEED}/api/matches/football`, { headers: { Accept: "application/json" }, cf: { cacheTtl: 30 } }).catch(() => null),
    fetch(`${MATCH_FEED}/api/matches/live`, { headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null),
  ]);

  const all = allResponse?.ok ? await allResponse.json() as RawMatch[] : [];
  const live = liveResponse?.ok ? await liveResponse.json() as RawMatch[] : [];
  const found = live.find(isTributeMatch) ?? all.find(isTributeMatch);
  const now = Date.now();

  if (!found) {
    return {
      found: false,
      home: "Argentina",
      away: "Benin",
      kickoff: FALLBACK_KICKOFF,
      live: now >= FALLBACK_KICKOFF && now <= FALLBACK_KICKOFF + 4 * 60 * 60_000,
      streams: [] as RawStream[],
    };
  }

  const kickoff = typeof found.date === "number" ? found.date : Number(found.date) || FALLBACK_KICKOFF;
  const liveMatch = live.find(item => clean(item.id) === clean(found.id)) ?? live.find(isTributeMatch);
  const refs = Array.isArray(liveMatch?.sources) && liveMatch!.sources!.length ? liveMatch!.sources! : (found.sources ?? []);
  const streamResults = await Promise.allSettled(refs.slice(0, 8).map(async ref => {
    const source = clean(ref.source).toLowerCase();
    const id = clean(ref.id);
    if (!/^[a-z0-9-]{1,32}$/.test(source) || !/^[a-zA-Z0-9._~-]{1,180}$/.test(id)) return [] as RawStream[];
    const response = await fetch(`${MATCH_FEED}/api/stream/${source}/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [] as RawStream[];
    return await response.json() as RawStream[];
  }));

  const seen = new Set<string>();
  const streams = streamResults
    .flatMap(result => result.status === "fulfilled" ? result.value : [])
    .flatMap((stream, index) => {
      const embedUrl = clean(stream.embedUrl);
      try {
        const parsed = new URL(embedUrl);
        if (parsed.protocol !== "https:" || seen.has(embedUrl)) return [];
      } catch { return []; }
      seen.add(embedUrl);
      return [{
        id: clean(stream.id, `messi-${index}`),
        streamNo: Number(stream.streamNo) || index + 1,
        language: clean(stream.language, "Stream"),
        hd: Boolean(stream.hd),
        embedUrl,
        source: clean(stream.source),
      }];
    })
    .sort((a, b) => Number(b.hd) - Number(a.hd))
    .slice(0, 8);

  return {
    found: true,
    home: clean(found.teams?.home?.name, "Argentina"),
    away: clean(found.teams?.away?.name, "Benin"),
    kickoff,
    live: Boolean(liveMatch) || (now >= kickoff && now <= kickoff + 4 * 60 * 60_000),
    streams,
  };
}

export async function messiData() {
  try {
    const data = await matchData();
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({
      found: false,
      home: "Argentina",
      away: "Benin",
      kickoff: FALLBACK_KICKOFF,
      live: false,
      streams: [],
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

export function messiPage() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#081725">
<title>NINETY · Gracias, Leo</title>
<meta name="description" content="A special NINETY matchday tribute to Lionel Messi for Argentina vs Benin.">
<style>
:root{--sky:#76c7f2;--white:#f7fbff;--ink:#06121d;--navy:#081725;--gold:#d9b75f;--muted:#9cb4c5}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#050c13;color:var(--white);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;z-index:-3;background:radial-gradient(circle at 76% 18%,rgba(118,199,242,.20),transparent 34%),radial-gradient(circle at 18% 18%,rgba(217,183,95,.08),transparent 25%),linear-gradient(145deg,#050c13 0%,#081725 48%,#07111a 100%)}
.grain{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.11;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.24'/%3E%3C/svg%3E")}
header{display:flex;align-items:center;justify-content:space-between;width:min(1320px,calc(100% - 40px));margin:auto;padding:24px 0;position:relative;z-index:10}
.brand{display:flex;align-items:center;gap:10px;font-weight:950;letter-spacing:-.04em}.brand b{font-size:1.35rem}.brand span{font-size:.68rem;letter-spacing:.16em;color:#ff5265}.open-private{color:#d8e3ec;text-decoration:none;border:1px solid rgba(255,255,255,.16);padding:10px 14px;border-radius:999px;font-size:.78rem;font-weight:750;backdrop-filter:blur(14px);background:rgba(255,255,255,.035)}
.hero{width:min(1320px,calc(100% - 40px));min-height:690px;margin:6px auto 0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(380px,.75fr);align-items:center;gap:50px;position:relative}
.kicker{display:inline-flex;align-items:center;gap:10px;color:var(--sky);font-size:.72rem;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.kicker i{width:34px;height:1px;background:var(--sky)}
h1{font-size:clamp(4rem,9vw,8.8rem);line-height:.82;letter-spacing:-.075em;margin:25px 0 26px;font-weight:950;max-width:820px}
h1 .soft{display:block;color:transparent;-webkit-text-stroke:1px rgba(247,251,255,.5)}h1 .leo{color:var(--sky)}
.lead{font-size:clamp(1.05rem,2vw,1.35rem);line-height:1.65;max-width:690px;color:#c4d1db;margin:0 0 28px}.lead strong{color:#fff}
.signature{display:flex;gap:16px;align-items:center;margin-top:32px}.ten{display:grid;place-items:center;width:64px;height:64px;border:1px solid rgba(217,183,95,.6);border-radius:50%;color:var(--gold);font-family:Georgia,serif;font-size:2rem;font-style:italic}.signature div span{display:block;color:#748a9a;font-size:.72rem;text-transform:uppercase;letter-spacing:.16em}.signature div b{display:block;margin-top:5px;font-family:Georgia,serif;font-size:1.12rem;font-style:italic;font-weight:500}
.portrait{align-self:end;position:relative;height:650px;display:flex;align-items:flex-end;justify-content:center}
.portrait:before{content:"10";position:absolute;right:-4%;top:2%;font-size:clamp(13rem,24vw,23rem);font-weight:950;line-height:.7;color:rgba(118,199,242,.045);letter-spacing:-.1em}
.portrait:after{content:"";position:absolute;inset:14% -10% 1%;z-index:-1;background:radial-gradient(ellipse at 50% 58%,rgba(118,199,242,.30),transparent 57%)}
.portrait img{height:min(92%,620px);max-width:100%;object-fit:contain;object-position:bottom;filter:drop-shadow(0 32px 55px rgba(0,0,0,.55));border-radius:22px 22px 0 0}
.photo-credit{position:absolute;right:10px;bottom:10px;background:rgba(3,10,16,.72);backdrop-filter:blur(8px);padding:6px 9px;border-radius:7px;color:#91a4b3;font-size:.57rem}.photo-credit a{color:#b7c8d4}
.match-shell{width:min(1180px,calc(100% - 40px));margin:0 auto 80px;position:relative}
.match-card{position:relative;overflow:hidden;border:1px solid rgba(118,199,242,.24);border-radius:28px;background:linear-gradient(135deg,rgba(10,27,42,.96),rgba(7,18,29,.96));box-shadow:0 32px 100px rgba(0,0,0,.35);padding:38px}
.match-card:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(118,199,242,.06),transparent 35%,transparent 65%,rgba(118,199,242,.06));pointer-events:none}
.match-top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.match-top span{font-size:.7rem;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:var(--sky)}.match-top b{font-size:.78rem;color:#d6e0e7;font-weight:700}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4c62;box-shadow:0 0 0 6px rgba(255,76,98,.12);margin-right:9px}
.teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px}.team{font-size:clamp(2.1rem,5vw,4.5rem);font-weight:950;letter-spacing:-.06em}.team.away{text-align:right}.versus{display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(255,255,255,.15);border-radius:50%;font-size:.72rem;color:#8498a8;font-weight:900}
.match-meta{text-align:center;margin:28px 0 0;color:#91a5b4;font-size:.86rem}.countdown{margin-top:8px;color:#fff;font-size:1.12rem;font-weight:800}
.player-wrap{margin-top:28px;display:none}.player-wrap.visible{display:block}.player-stage{aspect-ratio:16/9;width:100%;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.11);background:#020507;box-shadow:0 18px 50px rgba(0,0,0,.3)}iframe{width:100%;height:100%;border:0;display:block}
.source-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;font-size:.75rem;color:#8498a8}.source-bar select{max-width:240px;background:#0d1a26;color:#dce7ef;border:1px solid #294052;border-radius:9px;padding:8px 10px}
.status-action{display:flex;justify-content:center;margin-top:28px}.watch-btn{border:0;border-radius:999px;padding:15px 24px;background:linear-gradient(135deg,#8dd7fb,#5bb8e8);color:#06111a;font-weight:900;font-size:.88rem;cursor:pointer;box-shadow:0 12px 35px rgba(91,184,232,.20)}.watch-btn:disabled{opacity:.55;cursor:default}
.note{text-align:center;color:#778c9b;font-size:.75rem;line-height:1.6;margin:18px auto 0;max-width:700px}
.tribute{width:min(1180px,calc(100% - 40px));margin:0 auto 90px;display:grid;grid-template-columns:.8fr 1.2fr;gap:60px;padding-top:30px}.tribute aside{color:var(--gold);font-family:Georgia,serif;font-size:clamp(2.4rem,5vw,4.6rem);line-height:1.08;font-style:italic}.tribute p{font-size:1.04rem;line-height:1.9;color:#aebfcb;margin:0}.tribute p strong{color:#fff}
footer{border-top:1px solid rgba(255,255,255,.08);padding:28px 20px 38px;text-align:center;color:#617687;font-size:.72rem;line-height:1.7}
@media(max-width:850px){.hero{grid-template-columns:1fr;min-height:auto;padding-top:42px}.portrait{height:520px;order:2}.hero-copy{order:1}.teams{gap:12px}.tribute{grid-template-columns:1fr;gap:22px}.match-card{padding:26px}.open-private{font-size:0}.open-private:after{content:"Sign in";font-size:.75rem}}
@media(max-width:520px){header,.hero,.match-shell,.tribute{width:min(100% - 26px,1320px)}header{padding-top:max(18px,env(safe-area-inset-top))}h1{font-size:clamp(3.4rem,20vw,5.7rem)}.lead{font-size:.98rem}.portrait{height:420px}.portrait img{height:100%}.match-card{padding:22px 16px;border-radius:20px}.team{font-size:clamp(1.65rem,9vw,2.6rem)}.versus{width:42px;height:42px}.match-top{align-items:flex-start;flex-direction:column}.source-bar{align-items:flex-start;flex-direction:column}.source-bar select{width:100%;max-width:none}}
@media(prefers-reduced-motion:no-preference){.portrait img{animation:reveal 1s cubic-bezier(.2,.7,.2,1) both}.hero-copy{animation:rise .8s ease both}.match-card{animation:rise .8s .15s ease both}@keyframes reveal{from{opacity:0;transform:translateY(30px) scale(.98)}to{opacity:1;transform:none}}@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}}
</style>
</head>
<body>
<div class="grain"></div>
<header><div class="brand"><b>NINETY</b><span>TRIBUTE</span></div><a class="open-private" href="/login">Private NINETY sign in</a></header>
<main>
<section class="hero">
  <div class="hero-copy">
    <span class="kicker"><i></i>October 6, 2026 · Buenos Aires</span>
    <h1><span class="soft">GRACIAS,</span><span class="leo">LEO.</span></h1>
    <p class="lead"><strong>One final night in Argentina colors.</strong> For more than two decades, Lionel Messi made impossible moments feel inevitable. Tonight, NINETY steps away from its usual matchday look to simply say thank you.</p>
    <div class="signature"><span class="ten">10</span><div><span>A NINETY matchday tribute</span><b>For the joy, the magic, the memories.</b></div></div>
  </div>
  <div class="portrait">
    <img src="${MESSI_IMAGE}" alt="Lionel Messi playing for Argentina" referrerpolicy="no-referrer">
    <small class="photo-credit">Photo: Hossein Zohrevand / Tasnim News Agency · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></small>
  </div>
</section>

<section class="match-shell" id="match">
  <div class="match-card">
    <div class="match-top"><span><i class="dot"></i>THE FAREWELL MATCH</span><b id="statusText">Checking match status…</b></div>
    <div class="teams"><div class="team" id="home">ARGENTINA</div><div class="versus">VS</div><div class="team away" id="away">BENIN</div></div>
    <div class="match-meta"><div>Estadio Monumental · Buenos Aires</div><div class="countdown" id="countdown">Kickoff · 7:00 PM ET</div></div>
    <div class="status-action"><button class="watch-btn" id="watchButton" disabled>Checking broadcast…</button></div>
    <div class="player-wrap" id="playerWrap">
      <div class="player-stage" id="playerStage"></div>
      <div class="source-bar"><span id="sourceText"></span><select id="sourceSelect" aria-label="Broadcast source"></select></div>
    </div>
    <p class="note">This temporary tribute page is public for this matchday only. The rest of NINETY remains private.</p>
  </div>
</section>

<section class="tribute">
  <aside>“Football gave us Messi. Messi gave us memories forever.”</aside>
  <p>From a teenager carrying enormous expectation to the captain lifting the trophy every Argentine dreamed of, the story was never only about goals or medals. It was about staying, returning, trying again, and eventually sharing the greatest moments with an entire country. <strong>This page is our small salute to the number 10.</strong></p>
</section>
</main>
<footer>NINETY · Special Matchday Tribute<br>Image used under CC BY 4.0. This page is an independent fan tribute and is not affiliated with Lionel Messi, AFA or FIFA.</footer>
<script>
const fallbackKickoff=${FALLBACK_KICKOFF};
let data=null, timer=null, selected=0;
const $=id=>document.getElementById(id);
function fmt(ts){return new Date(ts).toLocaleString([], {weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"});}
function tick(){
  const kickoff=data?.kickoff||fallbackKickoff, diff=kickoff-Date.now();
  if(diff>0){const s=Math.floor(diff/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;$("countdown").textContent="Kickoff in "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")+" · "+fmt(kickoff);}
  else $("countdown").textContent=data?.live?"The farewell match is live":"Kickoff · "+fmt(kickoff);
}
function renderPlayer(index){
  const stream=data?.streams?.[index];if(!stream)return;
  selected=index;$("playerStage").innerHTML="";
  const frame=document.createElement("iframe");
  frame.src=stream.embedUrl;
  frame.title="Argentina versus Benin live broadcast";
  frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-presentation");
  frame.setAttribute("allow","autoplay; fullscreen; encrypted-media; picture-in-picture");
  frame.setAttribute("allowfullscreen","");
  $("playerStage").appendChild(frame);
  $("sourceText").textContent=(stream.hd?"HD · ":"")+(stream.language||"Stream");
  $("sourceSelect").value=String(index);
}
function render(){
  if(!data)return;
  $("home").textContent=(data.home||"Argentina").toUpperCase();$("away").textContent=(data.away||"Benin").toUpperCase();
  const streams=Array.isArray(data.streams)?data.streams:[];
  $("statusText").textContent=data.live?(streams.length?"LIVE NOW":"LIVE · broadcast pending"):"MATCHDAY";
  const btn=$("watchButton");
  if(data.live&&streams.length){btn.disabled=false;btn.textContent="Enter the farewell match";btn.onclick=()=>{$("playerWrap").classList.add("visible");renderPlayer(selected);btn.style.display="none";$("playerWrap").scrollIntoView({behavior:"smooth",block:"center"});};}
  else {btn.disabled=true;btn.textContent=data.live?"Waiting for broadcast source":"Opens when the match goes live";}
  const select=$("sourceSelect");select.innerHTML="";
  streams.forEach((s,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent="Source "+(i+1)+" · "+(s.language||"Stream")+(s.hd?" · HD":"");select.appendChild(o);});
  select.onchange=()=>renderPlayer(Number(select.value));
  tick();
}
async function load(){
  try{const r=await fetch("/messi/data",{cache:"no-store"});if(r.ok){data=await r.json();render();}}catch{}
}
load();setInterval(load,60000);timer=setInterval(tick,1000);
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=60",
      "Content-Security-Policy": "default-src 'none'; img-src https://upload.wikimedia.org data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-src https:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  });
}
