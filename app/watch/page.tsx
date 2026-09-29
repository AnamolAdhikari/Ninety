"use client";

import { ArrowLeft, ChevronRight, CirclePlay, ExternalLink, Maximize, RefreshCw, Share2, ShieldAlert, Signal, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isMatchEnded } from "../match-lifecycle";
import { highlightsSearchUrl } from "../highlights";

type ApiSource={source:string;id:string};
type Match={id:string;home:string;away:string;time:string;date?:number;live?:boolean;matchStatus?:string;homeBadge?:string;awayBadge?:string;apiSources?:ApiSource[]};
type ApiStream={id:string;streamNo:number;language:string;hd:boolean;embedUrl:string;source:string};
type LineupTeam={name:string;formation:string|null;players:Array<{id?:number;name:string;number?:number|null;pos?:string}>};
type LineupResult={status:"confirmed"|"unavailable";message?:string;source?:string;home?:LineupTeam;away?:LineupTeam};

function countdown(target:number,now:number){
  const seconds=Math.max(0,Math.floor((target-now)/1000)),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
  if(days)return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

export default function WatchPage(){
  const [match,setMatch]=useState<Match|null>(null),[streams,setStreams]=useState<ApiStream[]>([]),[selected,setSelected]=useState(0);
  const [status,setStatus]=useState<"loading"|"ready"|"error"|"scheduled"|"ended">("loading"),[playerKey,setPlayerKey]=useState(0),[retryKey,setRetryKey]=useState(0),[now,setNow]=useState(Date.now());
  const [saved,setSaved]=useState(false),[online,setOnline]=useState(true);
  const [lineup,setLineup]=useState<LineupResult|null>(null),[lineupLoading,setLineupLoading]=useState(false);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)}},[]);

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        setStatus("loading");
        const id=new URLSearchParams(window.location.search).get("match");
        if(!id)throw new Error();
        const response=await fetch("/api/matches");if(!response.ok)throw new Error();
        const data=await response.json() as {matches?:Match[]};
        const found=data.matches?.find(item=>item.id===id);if(!found)throw new Error();
        if(cancelled)return;setMatch(found);try{setSaved((JSON.parse(window.localStorage.getItem("ninety-favorites")||"[]") as string[]).includes(found.id));}catch{}
        if(isMatchEnded(found,Date.now())){setStreams([]);setStatus("ended");return;}
        if(found.date&&found.date>Date.now()){setStreams([]);setStatus("scheduled");return;}
        const results=await Promise.allSettled((found.apiSources??[]).map(async ref=>{
          const streamResponse=await fetch(`/api/streams?source=${encodeURIComponent(ref.source)}&id=${encodeURIComponent(ref.id)}`);
          if(!streamResponse.ok)return [];
          const result=await streamResponse.json() as {streams?:ApiStream[]};
          return result.streams??[];
        }));
        const seen=new Set<string>();
        const available=results.flatMap(result=>result.status==="fulfilled"?result.value:[]).filter(item=>!seen.has(item.embedUrl)&&seen.add(item.embedUrl)).sort((a,b)=>Number(b.hd)-Number(a.hd)).slice(0,12);
        if(!cancelled&&isMatchEnded(found,Date.now())){setStreams([]);setStatus("ended");return;}
        if(!cancelled&&available.length){
          const saved=window.localStorage.getItem("ninety-source:"+id);
          const remembered=Math.max(0,available.findIndex(item=>item.source+"|"+item.streamNo===saved));
          setStreams(available);setSelected(remembered);setStatus("ready");return;
        }
        if(!cancelled){setStreams([]);setStatus("error");}
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
        if(!cancelled&&updated)setMatch(updated);
      } catch {}
    };
    const timer=window.setInterval(()=>void refresh(),60000);
    return()=>{cancelled=true;window.clearInterval(timer);};
  },[match?.id]);

  const ended=Boolean(match&&isMatchEnded(match,now));
  const scheduled=Boolean(match?.date&&match.date>now);
  useEffect(()=>{
    if((status!=="error"&&status!=="scheduled")||!match||ended)return;
    const timer=window.setTimeout(()=>setRetryKey(key=>key+1),60000);
    return()=>window.clearTimeout(timer);
  },[status,match,ended]);

  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);

  useEffect(()=>{
    if(!match?.date)return;
    let cancelled=false;
    const load=async()=>{
      setLineupLoading(true);
      try{
        const params=new URLSearchParams({home:match.home,away:match.away,date:String(match.date),v:"2"});
        const response=await fetch(`/api/lineups?${params}`);
        if(!response.ok)throw new Error();
        const result=await response.json() as LineupResult;
        if(!cancelled)setLineup(result);
      }catch{if(!cancelled)setLineup({status:"unavailable",message:"Lineup information is temporarily unavailable."});}
      finally{if(!cancelled)setLineupLoading(false);}
    };
    void load();
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},10*60_000);
    return()=>{cancelled=true;window.clearInterval(interval);};
  },[match?.id,match?.home,match?.away,match?.date]);

  const stream=ended?undefined:streams[selected];
  useEffect(()=>{if(ended&&status!=="ended"){setStreams([]);setStatus("ended");}},[ended,status]);
  useEffect(()=>{if(match&&stream)window.localStorage.setItem("ninety-source:"+match.id,stream.source+"|"+stream.streamNo);},[match,stream]);
  const chooseStream=(index:number)=>{setSelected(index);setPlayerKey(key=>key+1);};
  const tryNext=()=>{if(streams.length)chooseStream((selected+1)%streams.length);};
  const toggleSaved=()=>{if(!match)return;let ids:string[]=[];try{ids=JSON.parse(window.localStorage.getItem("ninety-favorites")||"[]");}catch{}const next=ids.includes(match.id)?ids.filter(id=>id!==match.id):[...ids,match.id];window.localStorage.setItem("ninety-favorites",JSON.stringify(next));setSaved(next.includes(match.id));toast.success(next.includes(match.id)?"Match saved":"Removed from saved matches");};
  const share=async()=>{if(!match)return;try{if(navigator.share)await navigator.share({title:`${match.home} vs ${match.away} | NINETY Live`,url:window.location.href});else{await navigator.clipboard.writeText(window.location.href);toast.success("Match link copied");}}catch(error){if((error as Error).name!=="AbortError")toast.error("Could not share this match");}};
  return <main className="watch-page">
    <header className="watch-header"><a className="brand" href="/" aria-label="Back to NINETY Live"><img className="brand-mark" src="/ninety-mark.svg" alt="" aria-hidden="true"/><strong>NINETY</strong><em>LIVE</em></a><a className="back-link" href="/"><ArrowLeft size={17}/>All football matches</a></header>
    <div className="watch-wrap">
      <div className="watch-title"><div><span className="eyebrow"><i/> {ended?"FULL TIME":scheduled?"UPCOMING MATCH":"MATCHDAY"}</span><h1>{match?`${match.home} vs ${match.away}`:"Loading match…"}</h1>{match&&<p>Kick-off · {match.date?new Date(match.date).toLocaleString([], {weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):match.time} <span className="local-time-note">· Your local time</span></p>}<div className="watch-title-actions"><button className={saved?"active":""} onClick={toggleSaved}><Star size={15} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save match"}</button><button onClick={()=>void share()}><Share2 size={15}/>Share</button></div></div><div className="watch-badges">{match?.homeBadge&&<img src={match.homeBadge} alt={match.home} decoding="async"/>}<strong>VS</strong>{match?.awayBadge&&<img src={match.awayBadge} alt={match.away} decoding="async"/>}</div></div>
      {!ended&&!scheduled&&status==="ready"&&<div className="provider-notice" role="note" aria-label="Advertisement warning">
        <ShieldAlert size={23}/>
        <div>
          <strong>Before you press Play</strong>
          <span>The first click may open an advertisement in a new tab. Close that tab and return here.</span>
          <span>For fewer pop-ups, enable a trusted browser ad blocker before starting the stream.</span>
        </div>
      </div>}
      <div className={"watch-availability "+(!online?"offline":ended?"ended":status)} role="status"><Signal size={15}/><strong>{!online?"You are offline":ended?"Broadcast finished":scheduled?"Broadcast not live yet":status==="ready"?`${streams.length} broadcast ${streams.length===1?"link":"links"} found`:status==="loading"?"Checking broadcast sources":"No playable source yet"}</strong><span>{!online?"Reconnect to check for broadcasts.":ended?"Look for match highlights below.":status==="ready"?"Select a source if playback does not start.":scheduled?"We will check again as kick-off approaches.":status==="error"?"Checking again every 60 seconds.":"This may take a moment."}</span></div>
      <div className="watch-player">
        {stream?<iframe key={`${stream.embedUrl}-${playerKey}`} src={stream.embedUrl} title={match?`${match.home} versus ${match.away} live stream`:"Live football stream"} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen/>:ended||status==="error"||status==="scheduled"?<div className="broadcast-fallback">
          <div className="animated-pitch" aria-hidden="true"><div className="pitch-midline"/><div className="pitch-circle"/><div className="pitch-box left"/><div className="pitch-box right"/><div className="player p1"/><div className="player p2"/><div className="player p3"/><div className="player p4"/><div className="player p5"/><div className="player p6"/><div className="player p7"/><div className="player p8"/><div className="animated-ball"/></div>
          <div className="stadium-lights" aria-hidden="true"/>
          <div className="fallback-content"><CirclePlay size={48}/><span className="fallback-label">{ended?"FULL TIME":"MATCHDAY WARM-UP"}</span><strong>{ended?"This broadcast has ended":status==="scheduled"?"Broadcast starts closer to kick-off":"Broadcast temporarily unavailable"}</strong>{ended?<p>The broadcast has finished. Official highlights may become available on YouTube.</p>:status==="scheduled"&&match?.date?<div className="kickoff-countdown"><small>KICK-OFF IN</small><b>{countdown(match.date,now)}</b></div>:<p>We continue checking for a playable broadcast every 60 seconds.</p>}{ended&&match?<div className="fallback-actions"><a className="fallback-highlights" href={highlightsSearchUrl(match)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Find highlights on YouTube</a><a className="fallback-return" href="/">Return to matches</a></div>:<button onClick={()=>setRetryKey(key=>key+1)}><RefreshCw size={15}/>Check broadcast now</button>}</div>
        </div>:<div className="watch-loading"><RefreshCw className="spin" size={40}/><strong>Finding available broadcast</strong><span>Checking match sources…</span></div>}
      </div>
      {!ended&&<div className="watch-toolbar"><div><strong>Broadcast sources</strong><span>{streams.length?`${streams.length} available · ${stream?.language||"Select a source"}`:status==="scheduled"?"Preparing for kick-off":"Searching for a broadcast"}</span></div><div className="watch-actions">{streams.map((item,index)=><button key={`${item.source}-${item.id}-${index}`} aria-pressed={selected===index} className={selected===index?"active":""} onClick={()=>chooseStream(index)}><Signal size={14}/><span>{item.language||`Stream ${item.streamNo}`}</span><b>{item.hd?"HD":"SD"}</b></button>)}{stream&&<button className="utility-source" onClick={tryNext}><ChevronRight size={15}/>Try next source</button>}{stream&&<button className="utility-source" onClick={()=>setPlayerKey(key=>key+1)}><RefreshCw size={14}/>Reload</button>}{stream&&<button className="utility-source" onClick={()=>document.querySelector<HTMLElement>(".watch-player")?.requestFullscreen()}><Maximize size={14}/>Fullscreen</button>}</div></div>}
      {!ended&&!scheduled&&stream&&<p className="external-note"><ExternalLink size={14}/>If an advertisement opens, close the new tab and return to the match.</p>}
      {match&&<section className="lineup-section" aria-labelledby="lineup-heading"><div className="lineup-heading"><div><span className="eyebrow">MATCH DETAILS</span><h2 id="lineup-heading">Starting lineups</h2></div>{lineup?.status==="confirmed"&&<span className="lineup-confirmed">Confirmed starting XIs</span>}</div>
        {lineup?.status==="confirmed"&&lineup.home&&lineup.away?<><div className="lineup-teams">{[lineup.home,lineup.away].map(team=><div className="lineup-team" key={team.name}><div className="lineup-team-heading"><h3>{team.name}</h3>{team.formation&&<span>{team.formation}</span>}</div><ol>{team.players.map((player,index)=><li key={player.id??`${player.number}-${index}`}><b>{player.number??"—"}</b><span>{player.name}</span>{player.pos&&<small>{player.pos}</small>}</li>)}</ol></div>)}</div><p className="lineup-credit">Lineup data: {lineup.source}. Teams and kick-off are matched before lineups appear.</p></>:<div className="lineup-pending"><span className="lineup-pending-icon" aria-hidden="true">XI</span><div><strong>{lineupLoading&&!lineup?"Checking for confirmed lineups…":"Lineup availability"}</strong><p>{lineup?.message??"Starting XIs usually become available nearer kick-off. We only display confirmed squads."}</p></div></div>}
      </section>}
    </div>
  </main>;
}
