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
.messi-carousel{position:relative;width:100%;height:100%;overflow:hidden;border-radius:26px 26px 0 0;box-shadow:0 34px 80px rgba(0,0,0,.38)}
.messi-slide{position:absolute;inset:0;opacity:0;transform:scale(1.035);transition:opacity .9s ease,transform 5.4s ease;pointer-events:none}
.messi-slide.active{opacity:1;transform:scale(1);pointer-events:auto}
.messi-slide:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(3,10,16,.84) 100%)}
.messi-slide img{width:100%;height:100%;object-fit:cover;object-position:center 18%;display:block;filter:saturate(.9) contrast(1.04)}
.messi-slide[data-era="Argentina"] img{object-position:center 20%}
.messi-slide-copy{position:absolute;left:22px;right:22px;bottom:55px;z-index:2}.messi-slide-copy small{display:block;color:var(--sky);font-size:.62rem;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.messi-slide-copy strong{display:block;margin-top:5px;font-family:Georgia,serif;font-size:1.25rem;font-weight:500;font-style:italic}
.carousel-controls{position:absolute;z-index:4;left:18px;right:18px;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.carousel-dots{display:flex;gap:7px}.carousel-dot{width:7px;height:7px;padding:0;border:0;border-radius:999px;background:rgba(255,255,255,.32);cursor:pointer;transition:width .25s,background .25s}.carousel-dot.active{width:24px;background:var(--sky)}.carousel-arrows{display:flex;gap:7px}.carousel-arrows button{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(3,10,16,.55);color:white;cursor:pointer;backdrop-filter:blur(8px)}
.photo-credit{position:absolute;z-index:5;right:10px;top:10px;background:rgba(3,10,16,.72);backdrop-filter:blur(8px);padding:6px 9px;border-radius:7px;color:#91a4b3;font-size:.55rem}.photo-credit a{color:#b7c8d4}
.match-shell{width:min(1180px,calc(100% - 40px));margin:0 auto 80px;position:relative}
.match-card{position:relative;overflow:hidden;border:1px solid rgba(118,199,242,.24);border-radius:28px;background:linear-gradient(135deg,rgba(10,27,42,.96),rgba(7,18,29,.96));box-shadow:0 32px 100px rgba(0,0,0,.35);padding:38px}
.match-card:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(118,199,242,.06),transparent 35%,transparent 65%,rgba(118,199,242,.06));pointer-events:none}
.match-top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.match-top>span{font-size:.7rem;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:var(--sky)}.match-top b{font-size:.78rem;color:#d6e0e7;font-weight:700}.match-live-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end}.fans-live{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(88,225,143,.24);border-radius:999px;background:rgba(25,94,58,.20);padding:8px 12px;color:#c9f8da;font-size:.72rem;font-weight:800;white-space:nowrap}.fans-live strong{color:#fff;font-size:.82rem}.fans-icon{color:#65e99d;font-size:.95rem;line-height:1}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4c62;box-shadow:0 0 0 6px rgba(255,76,98,.12);margin-right:9px}
.teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px}.team{font-size:clamp(2.1rem,5vw,4.5rem);font-weight:950;letter-spacing:-.06em;display:flex;align-items:center;gap:16px}.team.away{text-align:right;justify-content:flex-end}.country-flag{font-size:clamp(2rem,4vw,3.6rem);letter-spacing:0;line-height:1;filter:drop-shadow(0 8px 18px rgba(0,0,0,.25))}.versus{display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(255,255,255,.15);border-radius:50%;font-size:.72rem;color:#8498a8;font-weight:900}
.match-meta{text-align:center;margin:28px 0 0;color:#91a5b4;font-size:.82rem}.venue{color:#8195a5}.kickoff-time{margin-top:7px;color:#dfe9f0;font-size:.95rem;font-weight:750}.countdown-pill{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;min-width:150px;border:1px solid rgba(217,183,95,.48);border-radius:999px;background:linear-gradient(135deg,rgba(217,183,95,.14),rgba(217,183,95,.06));padding:8px 13px;color:#f1cf73;font-size:.78rem;font-weight:900;letter-spacing:.04em;box-shadow:0 0 0 1px rgba(217,183,95,.04) inset}.broadcast-notice{display:none;max-width:560px;margin:22px auto 0;border:1px solid rgba(88,225,143,.34);border-radius:14px;background:rgba(24,103,65,.18);padding:13px 16px;color:#dfffea;text-align:center;font-size:.82rem;font-weight:800}.broadcast-notice.visible{display:block}.broadcast-notice.live:before{content:"●";margin-right:8px;color:#66f1a2}.broadcast-notice.early:before{content:"●";margin-right:8px;color:var(--sky)}
.player-wrap{margin-top:28px;display:none}.player-wrap.visible{display:block}.player-stage{aspect-ratio:16/9;width:100%;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.11);background:#020507;box-shadow:0 18px 50px rgba(0,0,0,.3)}iframe{width:100%;height:100%;border:0;display:block}
.source-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;font-size:.75rem;color:#8498a8}.source-bar select{max-width:240px;background:#0d1a26;color:#dce7ef;border:1px solid #294052;border-radius:9px;padding:8px 10px}
.status-action{display:flex;justify-content:center;margin-top:28px}.watch-btn{border:1px solid rgba(107,240,161,.45);border-radius:999px;padding:15px 26px;background:linear-gradient(135deg,#72eda8,#37c978);color:#04150c;font-weight:950;font-size:.88rem;cursor:pointer;box-shadow:0 14px 38px rgba(55,201,120,.23);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}.watch-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 18px 46px rgba(55,201,120,.32);filter:brightness(1.04)}.watch-btn:disabled{opacity:.55;cursor:default}
.note{text-align:center;color:#778c9b;font-size:.75rem;line-height:1.6;margin:18px auto 0;max-width:700px}
.prebroadcast{margin-top:30px;border-top:1px solid rgba(255,255,255,.09);padding-top:28px}.prebroadcast.hidden{display:none}.prebroadcast-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px}.prebroadcast-head div small{display:block;color:var(--sky);font-size:.63rem;font-weight:900;letter-spacing:.17em;text-transform:uppercase}.prebroadcast-head h3{margin:7px 0 0;font-size:clamp(1.3rem,3vw,2rem);letter-spacing:-.035em}.tribute-side{display:flex;align-items:flex-end;gap:12px;flex-direction:column}.prebroadcast-head p{margin:0;max-width:440px;color:#8296a5;font-size:.77rem;line-height:1.6;text-align:right}.tribute-toggle{border:1px solid rgba(118,199,242,.38);border-radius:999px;background:rgba(118,199,242,.08);color:#d9f2ff;padding:9px 13px;font-size:.72rem;font-weight:800;cursor:pointer}.prebroadcast.optional .tribute-video,.prebroadcast.optional .video-tabs{display:none}.prebroadcast.optional.open .tribute-video,.prebroadcast.optional.open .video-tabs{display:block}.tribute-video{aspect-ratio:16/9;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:#020507;box-shadow:0 18px 50px rgba(0,0,0,.28)}.tribute-video iframe{display:block;width:100%;height:100%;border:0}
.tribute{width:min(1180px,calc(100% - 40px));margin:0 auto 90px;display:grid;grid-template-columns:.8fr 1.2fr;gap:60px;padding-top:30px}.tribute aside{color:var(--gold);font-family:Georgia,serif;font-size:clamp(2.4rem,5vw,4.6rem);line-height:1.08;font-style:italic}.tribute p{font-size:1.04rem;line-height:1.9;color:#aebfcb;margin:0}.tribute p strong{color:#fff}
.photo-wall{width:min(1180px,calc(100% - 40px));margin:0 auto 78px}.photo-wall-grid{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:170px;gap:14px;margin-top:30px}.photo-card{position:relative;overflow:hidden;margin:0;border-radius:24px;border:1px solid rgba(255,255,255,.09);background:#07111a;box-shadow:0 22px 60px rgba(0,0,0,.26)}.photo-card.large{grid-column:span 7;grid-row:span 3}.photo-card.wide{grid-column:span 8;grid-row:span 2}.photo-card.medium{grid-column:span 5;grid-row:span 2}.photo-card img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.02);transition:transform .8s cubic-bezier(.2,.7,.2,1),filter .8s}.photo-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 36%,rgba(3,9,15,.92) 100%)}.photo-card:hover img{transform:scale(1.08);filter:saturate(1.08) contrast(1.04)}.photo-card figcaption{position:absolute;z-index:2;left:22px;right:22px;bottom:20px}.photo-card figcaption small{display:block;color:var(--sky);font-size:.62rem;font-weight:900;letter-spacing:.17em}.photo-card figcaption strong{display:block;margin-top:7px;color:#fff;font-family:Georgia,serif;font-size:clamp(1.05rem,2vw,1.45rem);font-style:italic;font-weight:500;line-height:1.3}
.legacy{width:min(1180px,calc(100% - 40px));margin:0 auto 78px}.legacy-heading{max-width:760px}.legacy-heading small,.letter small{color:var(--sky);font-size:.66rem;font-weight:900;letter-spacing:.19em}.legacy-heading h2,.letter h2{margin:8px 0 12px;font-size:clamp(2.2rem,5vw,4.5rem);letter-spacing:-.055em}.legacy-heading p{color:#8fa4b3;line-height:1.7}.legacy-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:30px}.legacy-grid article{position:relative;min-height:390px;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:26px;display:flex;flex-direction:column;justify-content:flex-end;background:#08141f;isolation:isolate}.legacy-grid article:before{content:"";position:absolute;inset:0;z-index:-2;background-image:var(--legacy-img);background-size:cover;background-position:center;transform:scale(1.04);transition:transform .8s ease,filter .8s ease;filter:saturate(.78) brightness(.6)}.legacy-grid article:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(4,10,16,.05) 20%,rgba(4,10,16,.94) 80%)}.legacy-grid article:hover:before{transform:scale(1.1);filter:saturate(1) brightness(.73)}.legacy-grid article>span{display:block;color:rgba(255,255,255,.32);font-size:3.3rem;font-weight:950;line-height:1}.legacy-grid small{display:block;margin-top:18px;color:var(--sky);font-size:.61rem;font-weight:900;letter-spacing:.17em}.legacy-grid h3{margin:8px 0 10px;font-size:1.35rem}.legacy-grid p{margin:0;color:#c4d0d8;font-size:.84rem;line-height:1.65}
.numbers{width:min(1180px,calc(100% - 40px));margin:0 auto 58px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(217,183,95,.22);border-radius:24px;overflow:hidden;background:linear-gradient(135deg,rgba(217,183,95,.055),rgba(118,199,242,.035))}.numbers div{padding:34px 22px;text-align:center;border-right:1px solid rgba(217,183,95,.16);position:relative}.numbers div:last-child{border-right:0}.numbers strong{display:block;color:var(--gold);font-family:Georgia,serif;font-size:clamp(3rem,6vw,5rem);font-style:italic;font-weight:500}.numbers span{display:block;margin-top:7px;color:#a8bac6;font-size:.78rem}
.memory-marquee{overflow:hidden;border-block:1px solid rgba(255,255,255,.07);margin:0 0 82px;padding:19px 0;background:rgba(255,255,255,.015)}.memory-track{display:flex;width:max-content;gap:28px;align-items:center;animation:marquee 28s linear infinite;color:#7890a1;font-size:.72rem;font-weight:900;letter-spacing:.2em}.memory-track b{color:var(--gold);font-family:Georgia,serif;font-size:1.25rem;font-style:italic;font-weight:500}.memory-track span{white-space:nowrap}@keyframes marquee{to{transform:translateX(-50%)}}
.letter{width:min(1180px,calc(100% - 40px));margin:0 auto 100px;display:grid;grid-template-columns:minmax(320px,.8fr) 1.2fr;gap:0;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:28px;background:linear-gradient(135deg,rgba(10,24,38,.96),rgba(5,14,22,.98));box-shadow:0 28px 80px rgba(0,0,0,.28)}.letter-art{position:relative;min-height:560px;overflow:hidden}.letter-art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 45%,rgba(7,17,27,.95) 100%)}.letter-art img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;transform:scale(1.03)}.letter-mark{position:absolute;left:24px;bottom:20px;z-index:2;font-family:Georgia,serif;color:transparent;-webkit-text-stroke:1px rgba(217,183,95,.7);font-size:8rem;line-height:.8;font-style:italic}.letter-copy{padding:56px 54px;align-self:center}.letter p{color:#a8bac6;font-size:1rem;line-height:1.9}.letter strong{display:block;margin-top:22px;color:#fff;font-family:Georgia,serif;font-size:1.3rem;font-style:italic;font-weight:500;line-height:1.5}
footer{border-top:1px solid rgba(255,255,255,.08);padding:28px 20px 38px;text-align:center;color:#617687;font-size:.72rem;line-height:1.7}
@media(max-width:850px){.photo-wall-grid{grid-auto-rows:150px}.photo-card.large,.photo-card.medium,.photo-card.wide{grid-column:span 6;grid-row:span 2}.hero{grid-template-columns:1fr;min-height:auto;padding-top:42px}.portrait{height:520px;order:2}.hero-copy{order:1}.teams{gap:12px}.tribute{grid-template-columns:1fr;gap:22px}.match-card{padding:26px}.open-private{font-size:0}.open-private:after{content:"Sign in";font-size:.75rem}.prebroadcast-head{align-items:flex-start;flex-direction:column}.tribute-side{align-items:flex-start}.prebroadcast-head p{text-align:left}.legacy-grid{grid-template-columns:repeat(2,1fr)}.letter{grid-template-columns:1fr}.letter-art{min-height:420px}.letter-art:after{background:linear-gradient(180deg,transparent 45%,rgba(7,17,27,.96) 100%)}.letter-copy{padding:38px 32px}.letter-mark{font-size:6rem}}
@media(max-width:520px){.photo-wall-grid{display:block}.photo-card.large,.photo-card.medium,.photo-card.wide{display:block;min-height:300px;margin-bottom:12px}header,.hero,.match-shell,.tribute,.legacy,.numbers,.letter{width:min(100% - 26px,1320px)}header{padding-top:max(18px,env(safe-area-inset-top))}h1{font-size:clamp(3.4rem,20vw,5.7rem)}.lead{font-size:.98rem}.portrait{height:420px}.portrait img{height:100%}.match-card{padding:22px 16px;border-radius:20px}.team{font-size:clamp(1.65rem,9vw,2.6rem)}.versus{width:42px;height:42px}.match-top{align-items:flex-start;flex-direction:column}.match-live-tools{width:100%;justify-content:space-between}.source-bar{align-items:flex-start;flex-direction:column}.source-bar select{width:100%;max-width:none}.legacy-grid{grid-template-columns:1fr}.numbers{grid-template-columns:repeat(2,1fr)}.numbers div:nth-child(2){border-right:0}.numbers div:nth-child(-n+2){border-bottom:1px solid rgba(217,183,95,.15)}.letter-mark{font-size:5rem}}
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
    <div class="messi-carousel" id="messiCarousel" aria-label="Lionel Messi career gallery">
      <article class="messi-slide active" data-era="Barcelona">
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/26/Leo_messi_barce_2005.jpg" alt="A young Lionel Messi playing for Barcelona in 2005">
        <div class="messi-slide-copy"><small>2005 · Barcelona</small><strong>The teenager who made the world look twice.</strong></div>
      </article>
      <article class="messi-slide" data-era="Barcelona">
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/7/70/Lionel_Messi_in_a_La_Liga_match_at_Camp_Nou%2C_Barcelona_%28_Ank_Kumar%2C_Infosys_Limited%29_06_%28cropped%29.jpg" alt="Lionel Messi playing for Barcelona">
        <div class="messi-slide-copy"><small>2014 · Barcelona</small><strong>Number 10 at the center of an era.</strong></div>
      </article>
      <article class="messi-slide" data-era="Argentina">
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Lionel_Messi_WC2022.jpg" alt="Lionel Messi playing for Argentina at the 2022 World Cup">
        <div class="messi-slide-copy"><small>2022 · Argentina</small><strong>The captain. The trophy. The dream fulfilled.</strong></div>
      </article>
      <article class="messi-slide" data-era="Inter Miami">
        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/0/06/Lionel_Messi_NYCFC_Miami_24_Sep_2025-057.jpg" alt="Lionel Messi playing for Inter Miami">
        <div class="messi-slide-copy"><small>2025 · Miami</small><strong>One more chapter, still carrying the number 10.</strong></div>
      </article>
      <article class="messi-slide" data-era="Barcelona">
        <img loading="lazy" src="https://images2.alphacoders.com/133/thumb-1920-1335727.jpeg" alt="Lionel Messi in Barcelona colors with a Champions League ball">
        <div class="messi-slide-copy"><small>Barcelona · European nights</small><strong>The biggest stage always seemed to belong to him.</strong></div>
      </article>
      <article class="messi-slide" data-era="Argentina">
        <img loading="lazy" src="https://images5.alphacoders.com/642/thumb-1920-642891.jpg" alt="Lionel Messi wearing Argentina number 10 with both arms raised">
        <div class="messi-slide-copy"><small>Argentina · Number 10</small><strong>A shirt, a number, an entire generation of memories.</strong></div>
      </article>
      <article class="messi-slide" data-era="Argentina">
        <img loading="lazy" src="https://w0.peakpx.com/wallpaper/526/416/HD-wallpaper-lionel-messi-argentina-national-football-team-portrait-football-star-argentinian-footballer-football-match-argentina.jpg" alt="Lionel Messi celebrating for Argentina">
        <div class="messi-slide-copy"><small>Argentina · Celebration</small><strong>Every roar. Every run. Every impossible moment.</strong></div>
      </article>
      <article class="messi-slide" data-era="Inter Miami">
        <img loading="lazy" src="https://wallpapers.com/images/hd/messi-inter-miami-corner-kick-fdwaqedo6ftznjmx.jpg" alt="Lionel Messi wearing number 10 for Inter Miami in front of supporters">
        <div class="messi-slide-copy"><small>Miami · The crowd follows</small><strong>Different colors. Same electricity when number 10 walks out.</strong></div>
      </article>
      <div class="carousel-controls">
        <div class="carousel-dots" id="carouselDots" aria-label="Choose career image"></div>
        <div class="carousel-arrows"><button type="button" id="carouselPrev" aria-label="Previous Messi image">‹</button><button type="button" id="carouselNext" aria-label="Next Messi image">›</button></div>
      </div>
      <small class="photo-credit">Career gallery · Wikimedia Commons</small>
    </div>
  </div>
</section>

<section class="match-shell" id="match">
  <div class="match-card">
    <div class="match-top"><span><i class="dot"></i>THE FAREWELL MATCH</span><div class="match-live-tools"><div class="fans-live" id="fansLive" aria-live="polite"><span class="fans-icon">♧</span><strong id="fansCount">1</strong><span>Fans Live Watching</span></div><b id="statusText">Checking match status…</b></div></div>
    <div class="teams"><div class="team"><span class="country-flag" aria-hidden="true">🇦🇷</span><span id="home">ARGENTINA</span></div><div class="versus">VS</div><div class="team away"><span id="away">BENIN</span><span class="country-flag" aria-hidden="true">🇧🇯</span></div></div>
    <div class="match-meta">
      <div class="venue">Estadio Monumental · Buenos Aires</div>
      <div class="kickoff-time" id="kickoffTime">Tuesday · 6:00 PM CDT</div>
      <div class="countdown-pill" id="countdown">Checking kickoff…</div>
    </div>
    <div class="broadcast-notice" id="broadcastNotice" role="status" aria-live="polite"></div>
    <div class="status-action"><button class="watch-btn" id="watchButton" disabled>Checking broadcast…</button></div>
    <div class="player-wrap" id="playerWrap">
      <div class="player-stage" id="playerStage"></div>
      <div class="source-bar"><span id="sourceText"></span><select id="sourceSelect" aria-label="Broadcast source"></select></div>
    </div>
    <section class="prebroadcast" id="prebroadcast">
      <div class="prebroadcast-head"><div><small id="tributeLabel">WHILE WE WAIT</small><h3>Relive the magic.</h3></div><div class="tribute-side"><p id="tributeCopy">Official FC Barcelona Messi tributes play here until an early or live broadcast source becomes available.</p><button class="tribute-toggle" id="tributeToggle" type="button" hidden>Watch tribute instead</button></div></div>
      <div class="tribute-video">
        <iframe
          id="tributeFrame"
          title="Lionel Messi tribute video"
          src="https://www.youtube-nocookie.com/embed/XGH4MuBH6PQ?autoplay=1&mute=1&controls=1&loop=1&playlist=XGH4MuBH6PQ%2C3ZRJUtQMvDU%2Cp7KjFFkuuQ4&rel=0&playsinline=1"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    </section>
    <p class="note">This temporary tribute page is public for this matchday only. The rest of NINETY remains private.</p>
  </div>
</section>

<section class="tribute">
  <aside>“Football gave us Messi. Messi gave us memories forever.”</aside>
  <p>From a teenager carrying enormous expectation to the captain lifting the trophy every Argentine dreamed of, the story was never only about goals or medals. It was about staying, returning, trying again, and eventually sharing the greatest moments with an entire country. <strong>This page is our small salute to the number 10.</strong></p>
</section>

<section class="photo-wall" aria-label="Lionel Messi career gallery">
  <div class="legacy-heading">
    <small>MEMORIES IN MOTION</small>
    <h2>A career that looked like cinema.</h2>
    <p>Barcelona nights, Argentina colors, the number 10, and the moments supporters carried home with them.</p>
  </div>
  <div class="photo-wall-grid">
    <figure class="photo-card large">
      <img src="https://images5.alphacoders.com/642/thumb-1920-642891.jpg" alt="Lionel Messi in Argentina colors" loading="lazy">
      <figcaption><small>ARGENTINA</small><strong>The shirt that carried a country's dream.</strong></figcaption>
    </figure>
    <figure class="photo-card medium">
      <img src="https://upload.wikimedia.org/wikipedia/commons/2/26/Leo_messi_barce_2005.jpg" alt="Young Lionel Messi at Barcelona in 2005" loading="lazy">
      <figcaption><small>BARCELONA · 2005</small><strong>Before the records, there was the fearless teenager.</strong></figcaption>
    </figure>
    <figure class="photo-card medium">
      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Lionel_Messi_WC2022.jpg" alt="Lionel Messi at the 2022 World Cup" loading="lazy">
      <figcaption><small>QATAR · 2022</small><strong>The night the dream became history.</strong></figcaption>
    </figure>
    <figure class="photo-card wide">
      <img src="https://images2.alphacoders.com/133/thumb-1920-1335727.jpeg" alt="Lionel Messi in Barcelona colors" loading="lazy">
      <figcaption><small>BARCELONA</small><strong>European nights under the brightest lights.</strong></figcaption>
    </figure>
    <figure class="photo-card medium">
      <img src="https://w0.peakpx.com/wallpaper/526/416/HD-wallpaper-lionel-messi-argentina-national-football-team-portrait-football-star-argentinian-footballer-football-match-argentina.jpg" alt="Lionel Messi celebrating for Argentina" loading="lazy">
      <figcaption><small>ARGENTINA</small><strong>The roar of a nation finally answered.</strong></figcaption>
    </figure>
    <figure class="photo-card medium">
      <img src="https://wallpapers.com/images/hd/messi-inter-miami-corner-kick-fdwaqedo6ftznjmx.jpg" alt="Lionel Messi for Inter Miami" loading="lazy">
      <figcaption><small>MIAMI</small><strong>A different continent, the same magnetic number 10.</strong></figcaption>
    </figure>
  </div>
</section>

<section class="legacy" aria-label="Lionel Messi legacy">
  <div class="legacy-heading"><small>THE JOURNEY</small><h2>From Rosario to forever.</h2><p>Not a list of statistics. A few chapters that changed how an entire generation remembers football.</p></div>
  <div class="legacy-grid">
    <article style="--legacy-img:url('https://upload.wikimedia.org/wikipedia/commons/2/26/Leo_messi_barce_2005.jpg')"><span>01</span><small>ROSARIO → BARCELONA</small><h3>The beginning</h3><p>A little boy with a ball, a dream, and a family willing to cross an ocean for it.</p></article>
    <article style="--legacy-img:url('https://images2.alphacoders.com/133/thumb-1920-1335727.jpeg')"><span>10</span><small>BARCELONA</small><h3>The masterpiece</h3><p>From La Masia to Camp Nou, the number 10 became shorthand for possibility.</p></article>
    <article style="--legacy-img:url('https://images5.alphacoders.com/642/thumb-1920-642891.jpg')"><span>🇦🇷</span><small>ARGENTINA</small><h3>The weight of home</h3><p>Expectation, heartbreak, criticism, then joy. The shirt finally felt like celebration.</p></article>
    <article style="--legacy-img:url('https://upload.wikimedia.org/wikipedia/commons/c/c8/Lionel_Messi_WC2022.jpg')"><span>★</span><small>QATAR 2022</small><h3>The dream completed</h3><p>The captain lifting the World Cup became the ending millions had waited to see.</p></article>
  </div>
</section>

<section class="numbers" aria-label="Lionel Messi milestones">
  <div><strong>8</strong><span>Ballon d'Or awards</span></div>
  <div><strong>1</strong><span>FIFA World Cup</span></div>
  <div><strong>2</strong><span>Copa América titles</span></div>
  <div><strong>10</strong><span>The number that became his</span></div>
</section>

<section class="memory-marquee" aria-label="Messi tribute phrases">
  <div class="memory-track">
    <span>ROSARIO</span><b>10</b><span>BARCELONA</span><b>10</b><span>ARGENTINA</span><b>10</b><span>QATAR</span><b>10</b><span>MIAMI</span><b>10</b>
    <span>ROSARIO</span><b>10</b><span>BARCELONA</span><b>10</b><span>ARGENTINA</span><b>10</b><span>QATAR</span><b>10</b><span>MIAMI</span><b>10</b>
  </div>
</section>

<section class="letter">
  <div class="letter-art">
    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Lionel_Messi_WC2022.jpg" alt="Lionel Messi in Argentina colors" loading="lazy">
    <span class="letter-mark">10</span>
  </div>
  <div class="letter-copy">
    <small>ONE LAST THANK YOU</small>
    <h2>Gracias for making football feel like this.</h2>
    <p>For the dribbles that made defenders stop. For the passes nobody else saw. For the free kicks that bent toward the impossible. For every quiet walk back to the halfway line after doing something extraordinary. For Barcelona. For Argentina. For every kid who tried the same move the next morning.</p>
    <p>Some careers are measured in trophies. Some are remembered in moments. Messi gave football both.</p>
    <strong>Tonight is not about saying goodbye to the memories. It is about giving them one more night to breathe.</strong>
  </div>
</section>
</main>
<footer>NINETY · Special Matchday Tribute<br>Image used under CC BY 4.0. This page is an independent fan tribute and is not affiliated with Lionel Messi, AFA or FIFA.</footer>
<script>
const fallbackKickoff=1791327600000;
let data=null,selected=0,carouselIndex=0,carouselTimer=null;
const $=id=>document.getElementById(id);

const slides=[...document.querySelectorAll(".messi-slide")];
const dotsRoot=$("carouselDots");
function showSlide(index){
  carouselIndex=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>slide.classList.toggle("active",i===carouselIndex));
  [...dotsRoot.children].forEach((dot,i)=>dot.classList.toggle("active",i===carouselIndex));
}
slides.forEach((_,i)=>{
  const dot=document.createElement("button");
  dot.type="button";
  dot.className="carousel-dot"+(i===0?" active":"");
  dot.setAttribute("aria-label","Show career image "+(i+1));
  dot.onclick=()=>{showSlide(i);restartCarousel();};
  dotsRoot.appendChild(dot);
});
function restartCarousel(){
  if(carouselTimer)clearInterval(carouselTimer);
  carouselTimer=setInterval(()=>showSlide(carouselIndex+1),4800);
}
$("carouselPrev").onclick=()=>{showSlide(carouselIndex-1);restartCarousel();};
$("carouselNext").onclick=()=>{showSlide(carouselIndex+1);restartCarousel();};
restartCarousel();

const tributeFrame=$("tributeFrame");
const tributeVideoId="XGH4MuBH6PQ";
const tributePlaylist=["XGH4MuBH6PQ","3ZRJUtQMvDU","p7KjFFkuuQ4"];
function tributeUrl(){
  return "https://www.youtube-nocookie.com/embed/"+tributeVideoId+"?autoplay=1&mute=1&controls=1&loop=1&playlist="+encodeURIComponent(tributePlaylist.join(","))+"&rel=0&playsinline=1";
}
function ensureTribute(force=false){
  if(!tributeFrame)return;
  const src=tributeUrl();
  if(force){
    tributeFrame.setAttribute("src","about:blank");
    requestAnimationFrame(()=>requestAnimationFrame(()=>tributeFrame.setAttribute("src",src)));
    return;
  }
  if(tributeFrame.getAttribute("src")!==src)tributeFrame.setAttribute("src",src);
}
function stopTribute(){
  if(!tributeFrame)return;
  if(tributeFrame.getAttribute("src")!=="about:blank")tributeFrame.setAttribute("src","about:blank");
}

function kickoffLabel(ts){
  return new Date(ts).toLocaleString([], {weekday:"long",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
}
function tick(){
  const kickoff=data?.kickoff||fallbackKickoff,diff=kickoff-Date.now();
  $("kickoffTime").textContent=kickoffLabel(kickoff);
  if(diff>0){
    const s=Math.floor(diff/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    $("countdown").textContent=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")+" TO KICKOFF";
  }else $("countdown").textContent=data?.live?"LIVE NOW":"KICKOFF REACHED";
}
function renderPlayer(index){
  const stream=data?.streams?.[index];if(!stream)return;
  selected=index;$("playerStage").innerHTML="";
  const frame=document.createElement("iframe");
  frame.src=stream.embedUrl;
  frame.title="Argentina versus Benin live broadcast";
  frame.setAttribute("allow","autoplay; fullscreen; encrypted-media; picture-in-picture");
  frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
  frame.setAttribute("allowfullscreen","");
  $("playerStage").appendChild(frame);
  $("sourceText").textContent=(stream.hd?"HD · ":"")+(stream.language||"Stream");
  $("sourceSelect").value=String(index);
}
function render(){
  if(!data)return;
  $("home").textContent=(data.home||"Argentina").toUpperCase();
  $("away").textContent=(data.away||"Benin").toUpperCase();
  const streams=Array.isArray(data.streams)?data.streams:[];
  $("statusText").textContent=streams.length?(data.live?"LIVE NOW":"BROADCAST OPEN"):data.live?"LIVE · broadcast pending":"MATCHDAY";
  const btn=$("watchButton"),notice=$("broadcastNotice"),tribute=$("prebroadcast"),toggle=$("tributeToggle");
  const kickoff=data.kickoff||fallbackKickoff;
  const msToKickoff=kickoff-Date.now();
  const broadcastPriority=data.live||msToKickoff<=60000;

  if(broadcastPriority){
    tribute.classList.add("optional");tribute.classList.remove("open");
    stopTribute();
    $("tributeLabel").textContent="TRIBUTE ARCHIVE";
    $("tributeCopy").textContent=data.live?"The match is live. The tribute remains available on demand.":"Kickoff is less than a minute away. Broadcast now takes priority.";
    toggle.hidden=false;toggle.textContent="Watch tribute instead";
    toggle.onclick=()=>{
      const open=tribute.classList.toggle("open");
      toggle.textContent=open?"Hide tribute":"Watch tribute instead";
      if(open)ensureTribute(true);else stopTribute();
    };

    if(streams.length){
      btn.disabled=false;btn.style.display="";
      btn.textContent=data.live?"Watch live broadcast":"Watch broadcast";
      notice.className="broadcast-notice visible live";
      notice.textContent=data.live?"The farewell broadcast is LIVE now.":"Kickoff is less than 1 minute away. The broadcast is ready.";
      btn.onclick=()=>{
        tribute.classList.add("optional");tribute.classList.remove("open");stopTribute();
        $("playerWrap").classList.add("visible");
        renderPlayer(selected);
        btn.style.display="none";
        $("playerWrap").scrollIntoView({behavior:"smooth",block:"center"});
      };
    }else{
      notice.className="broadcast-notice visible live";
      notice.textContent=data.live?"The match is live. NINETY is checking for the broadcast source.":"Kickoff is less than 1 minute away. NINETY is checking for the broadcast source.";
      btn.disabled=true;btn.style.display="";
      btn.textContent="Waiting for broadcast source";
    }
  }else{
    notice.className=streams.length?"broadcast-notice visible early":"broadcast-notice";
    notice.textContent=streams.length?"An early broadcast source is available. The tribute will keep playing until the final minute before kickoff.":"";
    btn.disabled=!streams.length;btn.style.display="";
    btn.textContent=streams.length?"Broadcast available":"Checking for an early broadcast";
    if(streams.length){
      btn.onclick=()=>{
        $("playerWrap").classList.add("visible");
        renderPlayer(selected);
        $("playerWrap").scrollIntoView({behavior:"smooth",block:"center"});
      };
    }
    tribute.classList.remove("optional","open");
    $("tributeLabel").textContent="WHILE WE WAIT";
    $("tributeCopy").textContent="The Argentina tribute plays automatically until the final minute before kickoff.";
    toggle.hidden=true;
    ensureTribute();
  }
  const select=$("sourceSelect");select.innerHTML="";
  streams.forEach((s,i)=>{
    const o=document.createElement("option");
    o.value=String(i);
    o.textContent="Source "+(i+1)+" · "+(s.language||"Stream")+(s.hd?" · HD":"");
    select.appendChild(o);
  });
  select.onchange=()=>renderPlayer(Number(select.value));
  tick();
}
const presenceVisitor=(()=>{try{const key="ninety-messi-visitor";let value=localStorage.getItem(key);if(!value){value=crypto.randomUUID();localStorage.setItem(key,value);}return value;}catch{return crypto.randomUUID();}})();
const presenceTab=crypto.randomUUID();
async function updatePresence(leave=false){
  try{
    const r=await fetch("/messi/presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitor:presenceVisitor,tab:presenceTab,leave}),keepalive:leave});
    if(!r.ok)return;
    const result=await r.json();
    if(typeof result.count==="number")$("fansCount").textContent=String(Math.max(1,result.count));
  }catch{}
}
updatePresence();
setInterval(()=>updatePresence(),30000);
addEventListener("pagehide",()=>{void updatePresence(true);});

async function load(){
  try{
    const r=await fetch("/messi/data",{cache:"no-store"});
    if(r.ok){data=await r.json();render();}
  }catch{}
}
load();
setInterval(load,30000);
setInterval(tick,1000);
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=60",
      "Content-Security-Policy": "default-src 'none'; img-src https://upload.wikimedia.org https://images2.alphacoders.com https://images5.alphacoders.com https://w0.peakpx.com https://wallpapers.com data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-src https:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  });
}
