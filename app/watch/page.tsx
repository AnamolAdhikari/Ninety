"use client";

import { ArrowLeft, ChevronRight, CirclePlay, ExternalLink, Maximize, RefreshCw, Share2, ShieldAlert, Signal, Star, Monitor, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isMatchEnded, isEffectivelyLive } from "../match-lifecycle";
import { MatchEvents } from "./match-events";
import { MatchPresenceBadge } from "./match-presence";
import { highlightsSearchUrl } from "../highlights";
import { accountStorage, initializeAccountStorage } from "../account-storage";

type ApiSource={source:string;id:string};
type Match={id:string;home:string;away:string;time:string;date?:number;live?:boolean;matchStatus?:string;homeBadge?:string;awayBadge?:string;apiSources?:ApiSource[]};
type ApiStream={id:string;streamNo:number;language:string;hd:boolean;embedUrl:string;source:string};
type LineupTeam={name:string;logo?:string;formation:string|null;players:Array<{id?:number;name:string;photo?:string;number?:number|null;pos?:string}>};
type LineupResult={status:"confirmed"|"unavailable";message?:string;source?:string;checkedAt?:number;home?:LineupTeam;away?:LineupTeam};
type FinishedDetails={status:"available"|"unavailable";finalScore?:{home:number|null;away:number|null};message?:string};

function YouTubeLogo({size=18}:{size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="4" fill="#ff0033"/><path d="M10 9l5 3-5 3V9z" fill="#fff"/></svg>;
}

function LineupImage({src,name,kind}:{src?:string;name:string;kind:"team"|"player"}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  const initials=name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join("").toUpperCase();
  return <span className={`lineup-image lineup-image-${kind}`}>
    {src&&!failed?<img src={src} alt={kind==="team"?`${name} badge`:`${name} portrait`} width={kind==="team"?44:40} height={kind==="team"?44:40} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span className="lineup-image-fallback" aria-label={kind==="team"?`${name} badge unavailable`:`${name} photo unavailable`}>{initials}</span>}
  </span>;
}

function countdown(target:number,now:number){
  const seconds=Math.max(0,Math.floor((target-now)/1000)),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
  if(days)return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

export default function WatchPage(){
  const [match,setMatch]=useState<Match|null>(null),[streams,setStreams]=useState<ApiStream[]>([]),[selected,setSelected]=useState(0);
  const [status,setStatus]=useState<"loading"|"ready"|"error"|"scheduled"|"ended">("loading"),[playerKey,setPlayerKey]=useState(0),[retryKey,setRetryKey]=useState(0),[now,setNow]=useState(Date.now());
  const [fixtures,setFixtures]=useState<Match[]>([]),[cinema,setCinema]=useState(false),[detailsTab,setDetailsTab]=useState<"lineups"|"highlights"|"events">("events");
  const failedSources=useRef(new Set<string>());
  const rejectedSources=useRef(new Set<string>());
  const [recoveryMessage,setRecoveryMessage]=useState("");
  const [saved,setSaved]=useState(false),[online,setOnline]=useState(true);
  const [lineup,setLineup]=useState<LineupResult|null>(null),[lineupLoading,setLineupLoading]=useState(false),[lineupRetry,setLineupRetry]=useState(0);
  const [finishedDetails,setFinishedDetails]=useState<FinishedDetails|null>(null);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)}},[]);

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        setStatus("loading");
        failedSources.current.clear();if(!rejectedSources.current.size)setRecoveryMessage("");
        await initializeAccountStorage();
        const id=new URLSearchParams(window.location.search).get("match");
        if(!id)throw new Error();
        const response=await fetch("/api/matches");if(!response.ok)throw new Error();
        const data=await response.json() as {matches?:Match[]};
        const found=data.matches?.find(item=>item.id===id);if(!found)throw new Error();
        if(cancelled)return;setFixtures(data.matches??[]);setMatch(found);try{setSaved((JSON.parse(accountStorage.getItem("ninety-favorites")||"[]") as string[]).includes(found.id));}catch{}
        if(isMatchEnded(found,Date.now())){setStreams([]);setStatus("ended");return;}
        if(found.date&&found.date>Date.now()){setStreams([]);setStatus("scheduled");return;}
        const results=await Promise.allSettled((found.apiSources??[]).map(async ref=>{
          const streamResponse=await fetch(`/api/streams?source=${encodeURIComponent(ref.source)}&id=${encodeURIComponent(ref.id)}`);
          if(!streamResponse.ok)return [];
          const result=await streamResponse.json() as {streams?:ApiStream[]};
          return result.streams??[];
        }));
        const seen=new Set<string>();
        const returned=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
        const available=returned.filter(item=>!rejectedSources.current.has(item.embedUrl)&&!seen.has(item.embedUrl)&&seen.add(item.embedUrl)).sort((a,b)=>Number(b.hd)-Number(a.hd)).slice(0,12);
        const onlyRejected=returned.length>0&&available.length===0&&returned.every(item=>rejectedSources.current.has(item.embedUrl));
        if(!cancelled&&isMatchEnded(found,Date.now())){setStreams([]);setStatus("ended");return;}
        if(!cancelled&&available.length){
          const saved=accountStorage.getItem("ninety-source:"+id);
          const remembered=Math.max(0,available.findIndex(item=>item.source+"|"+item.streamNo===saved));
          setStreams(available);setSelected(remembered);setStatus("ready");return;
        }
        if(!cancelled){setStreams([]);setStatus("error");if(onlyRejected)setRecoveryMessage("No replacement source is available yet. The provider is still returning only the stream you marked wrong. NINETY will check again automatically every 60 seconds.");}
      }catch{if(!cancelled)setStatus("error");}
    }
    void load();return()=>{cancelled=true;};
  },[retryKey]);

  // Refresh match status without reloading the currently playing iframe.
  useEffect(()=>{
    if(!match?.id)return;
    let cancelled=false;
    const refresh=async()=>{
      if(document.hidden)return;
      try { const response=await fetch("/api/matches",{cache:"no-store"}); if(!response.ok)return;
        const data=await response.json() as {matches?:Match[]}; const updated=data.matches?.find(item=>item.id===match.id);
        if(!cancelled){setFixtures(data.matches??[]);if(updated)setMatch(updated);}
      } catch {}
    };
    const timer=window.setInterval(()=>void refresh(),60000);
    return()=>{cancelled=true;window.clearInterval(timer);};
  },[match?.id]);

  useEffect(()=>{if(!cinema)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setCinema(false);};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[cinema]);
  const otherLive=fixtures.filter(item=>item.id!==match?.id&&isEffectivelyLive(item,now));
  const ended=Boolean(match&&isMatchEnded(match,now));
  const scheduled=Boolean(match?.date&&match.date>now);
  useEffect(()=>{if(!ended&&detailsTab==="highlights")setDetailsTab("events");},[ended,detailsTab]);
  useEffect(()=>{
    if((status!=="error"&&status!=="scheduled")||!match||ended)return;
    const timer=window.setTimeout(()=>setRetryKey(key=>key+1),60000);
    return()=>window.clearTimeout(timer);
  },[status,match,ended]);

  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);

  useEffect(()=>{
    if(!ended||!match?.date){setFinishedDetails(null);return;}
    let cancelled=false;
    const load=async()=>{
      try{
        const response=await fetch('/api/match-details?'+new URLSearchParams({home:match.home,away:match.away,date:String(match.date)}),{cache:'no-store'});
        if(!response.ok)throw new Error();
        const result=await response.json() as FinishedDetails;
        if(!cancelled)setFinishedDetails(result);
      }catch{if(!cancelled)setFinishedDetails({status:'unavailable'});}
    };
    void load();
    return()=>{cancelled=true;};
  },[ended,match?.id,match?.home,match?.away,match?.date]);

  useEffect(()=>{setLineup(null);setLineupLoading(false);},[match?.id]);
  useEffect(()=>{
    if(detailsTab!=="lineups"||!match?.date)return;
    let cancelled=false;
    const load=async()=>{
      if(document.hidden)return;
      setLineupLoading(true);
      try{
        const params=new URLSearchParams({home:match.home,away:match.away,date:String(match.date),v:"4"});
        const response=await fetch(`/api/lineups?${params}`);
        if(!response.ok)throw new Error();
        const result=await response.json() as LineupResult;
        if(!cancelled)setLineup(result);
      }catch{if(!cancelled)setLineup({status:"unavailable",message:"Lineup information is temporarily unavailable."});}
      finally{if(!cancelled)setLineupLoading(false);}
    };
    void load();
    return()=>{cancelled=true;};
  },[detailsTab,lineupRetry,match?.id,match?.home,match?.away,match?.date]);

  const stream=ended?undefined:streams[selected];
  useEffect(()=>{if(ended&&status!=="ended"){setStreams([]);setStatus("ended");}},[ended,status]);
  useEffect(()=>{if(match&&stream)accountStorage.setItem("ninety-source:"+match.id,stream.source+"|"+stream.streamNo);},[match,stream]);
  const chooseStream=(index:number)=>{setSelected(index);setPlayerKey(key=>key+1);};
  const reportRetry=()=>{void fetch("/api/playback-report",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).catch(()=>{});};
  const tryNext=()=>{reportRetry();if(streams.length>1){chooseStream((selected+1)%streams.length);setRecoveryMessage("Switched broadcast source. Press Play in the player if needed.");}else{setRetryKey(key=>key+1);setRecoveryMessage("Checking the provider again for a corrected or additional source…");}};
  const rejectCurrent=()=>{if(!stream)return;rejectedSources.current.add(stream.embedUrl);reportRetry();setStreams(current=>current.filter(item=>item.embedUrl!==stream.embedUrl));setSelected(0);setStatus("error");setRecoveryMessage("Wrong broadcast hidden for this session. Checking for a replacement source…");setRetryKey(key=>key+1);};
  const frameError=()=>{if(!stream||!online)return;failedSources.current.add(stream.embedUrl);const next=streams.findIndex(item=>!failedSources.current.has(item.embedUrl));reportRetry();if(next>=0){chooseStream(next);setRecoveryMessage("The player could not load. Trying another listed source.");}else{setStreams([]);setStatus("error");}};
  useEffect(()=>{const refresh=()=>{if(match)try{setSaved((JSON.parse(accountStorage.getItem("ninety-favorites")||"[]") as string[]).includes(match.id));}catch{}};window.addEventListener("ninety-preferences",refresh);return()=>window.removeEventListener("ninety-preferences",refresh);},[match]);
  const toggleSaved=()=>{if(!match)return;let ids:string[]=[];try{ids=JSON.parse(accountStorage.getItem("ninety-favorites")||"[]");}catch{}const next=ids.includes(match.id)?ids.filter(id=>id!==match.id):[...ids,match.id];accountStorage.setItem("ninety-favorites",JSON.stringify(next));setSaved(next.includes(match.id));toast.success(next.includes(match.id)?"Match saved":"Removed from saved matches");};
  const share=async()=>{if(!match)return;try{if(navigator.share)await navigator.share({title:`${match.home} vs ${match.away} | NINETY Live`,url:window.location.href});else{await navigator.clipboard.writeText(window.location.href);toast.success("Match link copied");}}catch(error){if((error as Error).name!=="AbortError")toast.error("Could not share this match");}};
  return <main className={"watch-page"+(cinema?" cinema-mode":"")}>
    <header className="watch-header"><a className="brand" href="/" aria-label="Back to NINETY Live"><img className="brand-mark" src="/ninety-mark.svg" alt="" aria-hidden="true"/><strong>NINETY</strong><em>LIVE</em></a><a className="back-link" href="/"><ArrowLeft size={17}/>All football matches</a></header>
    <div className="watch-wrap">
      <div className="watch-title"><div><span className="eyebrow"><i/> {ended?"FULL TIME":scheduled?"UPCOMING MATCH":"MATCHDAY"}</span><h1>{match?`${match.home} vs ${match.away}`:"Loading match…"}</h1>{match&&<p>Kick-off · {match.date?new Date(match.date).toLocaleString([], {weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):match.time} <span className="local-time-note">· Your local time</span></p>}<div className="watch-title-actions">{match&&<MatchPresenceBadge matchId={match.id}/>}<button className={saved?"active":""} onClick={toggleSaved}><Star size={15} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save match"}</button><button onClick={()=>void share()}><Share2 size={15}/>Share</button></div></div><div className="watch-badges">{match?.homeBadge&&<img src={match.homeBadge} alt={match.home} decoding="async"/>}<strong>VS</strong>{match?.awayBadge&&<img src={match.awayBadge} alt={match.away} decoding="async"/>}</div></div>
      {!ended&&!scheduled&&status==="ready"&&<div className="provider-notice" role="note" aria-label="Advertisement warning">
        <ShieldAlert size={23}/>
        <div>
          <strong>Before you press Play</strong>
          <span>The first click may open an advertisement in a new tab. Close that tab and return here.</span>
          <span>For fewer pop-ups, enable a trusted browser ad blocker before starting the stream.</span>
        </div>
      </div>}
      <div className={"watch-availability "+(!online?"offline":ended?"ended":status)} role="status"><Signal size={15}/><strong>{!online?"You are offline":ended?"Broadcast finished":scheduled?"Broadcast not live yet":status==="ready"?`${streams.length} broadcast ${streams.length===1?"link":"links"} found`:status==="loading"?"Checking broadcast sources":"No playable source yet"}</strong><span>{!online?"Reconnect to check for broadcasts.":ended?"Look for match highlights below.":status==="ready"?"Select a source if playback does not start.":scheduled?"We will check again as kick-off approaches.":status==="error"?"Checking again every 60 seconds.":"This may take a moment."}</span></div>
      <div className="watch-view-controls"><div>{otherLive.length>0&&<label className="quick-match-switch"><span>Other live games</span><select aria-label="Switch to another live match" value="" onChange={event=>{if(event.target.value)window.location.assign(`/watch?match=${encodeURIComponent(event.target.value)}`);}}><option value="">Choose a game ({otherLive.length})</option>{otherLive.map(item=><option key={item.id} value={item.id}>{item.home} vs {item.away}</option>)}</select></label>}</div><button className={cinema?"cinema-toggle active":"cinema-toggle"} aria-pressed={cinema} onClick={()=>setCinema(value=>!value)}>{cinema?<X size={16}/>:<Monitor size={16}/>}<span>{cinema?"Exit cinema":"Cinema mode"}</span></button></div>
      <div className="watch-player">
        {stream?<iframe key={`${stream.embedUrl}-${playerKey}`} src={stream.embedUrl} title={match?`${match.home} versus ${match.away} live stream`:"Live football stream"} sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen onError={frameError}/>:ended||status==="error"||status==="scheduled"?<div className={"broadcast-fallback"+(ended?" ended":"")}>
          <div className="animated-pitch" aria-hidden="true"><div className="pitch-midline"/><div className="pitch-circle"/><div className="pitch-box left"/><div className="pitch-box right"/><div className="player p1"/><div className="player p2"/><div className="player p3"/><div className="player p4"/><div className="player p5"/><div className="player p6"/><div className="player p7"/><div className="player p8"/><div className="animated-ball"/></div>
          <div className="stadium-lights" aria-hidden="true"/>
          <div className="fallback-content">{ended&&match?<><span className="fallback-label">FULL TIME</span><div className="finished-summary"><div className="finished-team"><span>{match.home}</span>{match.homeBadge&&<img src={match.homeBadge} alt="" aria-hidden="true"/>}</div><div className="finished-score">{finishedDetails?.status==="available"&&finishedDetails.finalScore?.home!=null&&finishedDetails.finalScore?.away!=null?<><b>{finishedDetails.finalScore.home}</b><span>–</span><b>{finishedDetails.finalScore.away}</b></>:<small>Score unavailable</small>}</div><div className="finished-team away">{match.awayBadge&&<img src={match.awayBadge} alt="" aria-hidden="true"/>}<span>{match.away}</span></div></div><div className="finished-highlights-only"><a className="fallback-highlights" href={highlightsSearchUrl(match)} target="_blank" rel="noopener noreferrer"><YouTubeLogo size={19}/>Watch highlights on YouTube</a></div></>:<><CirclePlay size={48}/><span className="fallback-label">MATCHDAY WARM-UP</span><strong>{status==="scheduled"?"Broadcast starts closer to kick-off":rejectedSources.current.size?"No replacement broadcast yet":"Broadcast temporarily unavailable"}</strong>{status==="scheduled"&&match?.date?<div className="kickoff-countdown"><small>KICK-OFF IN</small><b>{countdown(match.date,now)}</b></div>:<p>{rejectedSources.current.size?"The only source returned is the one you marked wrong. We will keep checking for a corrected source every 60 seconds.":"We continue checking for a playable broadcast every 60 seconds."}</p>}<button onClick={()=>setRetryKey(key=>key+1)}><RefreshCw size={15}/>{rejectedSources.current.size?"Check for replacement":"Check broadcast now"}</button></>}</div>
        </div>:<div className="watch-loading"><RefreshCw className="spin" size={40}/><strong>Finding available broadcast</strong><span>Checking match sources…</span></div>}
      </div>
      {stream&&!ended&&!scheduled&&<details className="playback-recovery"><summary>Playback not starting?</summary><div><p>If the player is blank or buffering, try another listed source. Availability depends on the broadcaster.</p><div className="recovery-actions"><button onClick={tryNext}><ChevronRight size={16}/>{streams.length>1?"Try another source":"Refresh sources"}</button><button onClick={()=>{reportRetry();setPlayerKey(key=>key+1);setRecoveryMessage("Player reloaded. Press Play if needed.");}}><RefreshCw size={15}/>Reload player</button><button onClick={()=>setRetryKey(key=>key+1)}><Signal size={15}/>Check for new sources</button></div></div></details>}
      {recoveryMessage&&<p className="recovery-message" role="status">{recoveryMessage}</p>}
      {!ended&&<div className="watch-toolbar"><div><strong>Broadcast sources</strong><span>{streams.length?`${streams.length} available · ${stream?.language||"Select a source"}`:status==="scheduled"?"Preparing for kick-off":"Searching for a broadcast"}</span></div><div className="watch-actions">{streams.map((item,index)=><button key={`${item.source}-${item.id}-${index}`} aria-pressed={selected===index} className={selected===index?"active":""} onClick={()=>chooseStream(index)}><Signal size={14}/><span>{item.language||`Stream ${item.streamNo}`}</span><b>{item.hd?"HD":"SD"}</b></button>)}{stream&&<button className="utility-source" onClick={tryNext}><ChevronRight size={15}/>{streams.length>1?"Try next source":"Refresh sources"}</button>}{stream&&<button className="utility-source" onClick={rejectCurrent}><X size={14}/>Wrong stream</button>}{stream&&<button className="utility-source" onClick={()=>setPlayerKey(key=>key+1)}><RefreshCw size={14}/>Reload</button>}{stream&&<button className="utility-source" onClick={()=>document.querySelector<HTMLElement>(".watch-player")?.requestFullscreen()}><Maximize size={14}/>Fullscreen</button>}</div></div>}
      {!ended&&!scheduled&&stream&&<p className="external-note"><ExternalLink size={14}/>If an advertisement opens, close the new tab and return to the match.</p>}
      {match&&<div className="match-detail-tabs" role="tablist" aria-label="Match details"><button id="events-tab" role="tab" aria-selected={detailsTab==="events"} aria-controls="events-panel" onClick={()=>setDetailsTab("events")} className={detailsTab==="events"?"active":""}>Match events</button><button id="lineups-tab" role="tab" aria-selected={detailsTab==="lineups"} aria-controls="lineups-panel" onClick={()=>setDetailsTab("lineups")} className={detailsTab==="lineups"?"active":""}>Lineups</button>{ended&&<button id="highlights-tab" role="tab" aria-selected={detailsTab==="highlights"} aria-controls="highlights-panel" onClick={()=>setDetailsTab("highlights")} className={detailsTab==="highlights"?"active":""}>Highlights</button>}</div>}
      {match&&detailsTab==="events"&&(match.date?<MatchEvents home={match.home} away={match.away} date={match.date} ended={ended} active={!ended&&!scheduled}/>:<p>Match events are unavailable without a confirmed kick-off time.</p>)}
      {match&&ended&&detailsTab==="highlights"&&<section id="highlights-panel" role="tabpanel" aria-labelledby="highlights-tab" className="match-highlights-panel"><YouTubeLogo size={28}/><div><h2>Match highlights</h2><p>Highlights may be available on YouTube after full time.</p><a href={highlightsSearchUrl(match)} target="_blank" rel="noopener noreferrer"><YouTubeLogo size={17}/>Watch highlights on YouTube</a></div></section>}
      {match&&detailsTab==="lineups"&&<section id="lineups-panel" role="tabpanel" className="lineup-section" aria-labelledby="lineups-tab"><div className="lineup-heading"><div><span className="eyebrow">MATCH DETAILS</span><h2 id="lineup-heading">Starting lineups</h2></div>{lineup?.status==="confirmed"&&<span className="lineup-confirmed">Confirmed starting XIs</span>}</div>
        {lineup?.status==="confirmed"&&lineup.home&&lineup.away?<><div className="lineup-teams">{[lineup.home,lineup.away].map(team=><div className="lineup-team" key={team.name}><div className="lineup-team-heading"><div className="lineup-team-identity"><LineupImage src={team.logo??(team.name===match.home?match.homeBadge:match.awayBadge)} name={team.name} kind="team"/><h3>{team.name}</h3></div>{team.formation&&<span>{team.formation}</span>}</div><ol>{team.players.map((player,index)=><li key={player.id??`${player.number}-${index}`}><LineupImage src={player.photo} name={player.name} kind="player"/><b>{player.number??"—"}</b><span className="lineup-player-name">{player.name}</span>{player.pos&&<small>{player.pos}</small>}</li>)}</ol></div>)}</div><p className="lineup-credit">Lineup data: {lineup.source}.{lineup.checkedAt?" Checked "+new Date(lineup.checkedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})+".":""} Teams and kick-off are matched before lineups appear.</p></>:<div className="lineup-pending"><span className="lineup-pending-icon" aria-hidden="true">XI</span><div><strong>{lineupLoading&&!lineup?"Checking for confirmed lineups…":"Lineup availability"}</strong><p>{lineup?.message??"Starting XIs usually become available nearer kick-off. We only display confirmed squads."}</p>{lineup?.status==="unavailable"&&!/allowance|quota|request limit/i.test(lineup.message??"")&&<button className="lineup-retry" disabled={lineupLoading} onClick={()=>setLineupRetry(value=>value+1)}><RefreshCw size={14}/>{lineupLoading?"Checking…":"Check again"}</button>}</div></div>}
      </section>}
    </div>
  </main>;
}
