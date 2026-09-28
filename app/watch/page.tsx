"use client";

import { ArrowLeft, ChevronRight, CirclePlay, ExternalLink, Maximize, RefreshCw, ShieldAlert, Signal } from "lucide-react";
import { useEffect, useState } from "react";
import { isMatchEnded } from "../match-lifecycle";

type ApiSource={source:string;id:string};
type Match={id:string;home:string;away:string;time:string;date?:number;live?:boolean;homeBadge?:string;awayBadge?:string;apiSources?:ApiSource[]};
type ApiStream={id:string;streamNo:number;language:string;hd:boolean;embedUrl:string;source:string};

function countdown(target:number,now:number){
  const seconds=Math.max(0,Math.floor((target-now)/1000)),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
  if(days)return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

export default function WatchPage(){
  const [match,setMatch]=useState<Match|null>(null),[streams,setStreams]=useState<ApiStream[]>([]),[selected,setSelected]=useState(0);
  const [status,setStatus]=useState<"loading"|"ready"|"error"|"scheduled"|"ended">("loading"),[playerKey,setPlayerKey]=useState(0),[retryKey,setRetryKey]=useState(0),[now,setNow]=useState(Date.now());

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
        if(cancelled)return;setMatch(found);
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

  const ended=Boolean(match&&isMatchEnded(match,now));
  useEffect(()=>{
    if((status!=="error"&&status!=="scheduled")||!match||ended)return;
    const timer=window.setTimeout(()=>setRetryKey(key=>key+1),60000);
    return()=>window.clearTimeout(timer);
  },[status,match,ended]);

  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);

  const stream=ended?undefined:streams[selected];
  useEffect(()=>{if(ended&&status!=="ended"){setStreams([]);setStatus("ended");}},[ended,status]);
  useEffect(()=>{if(match&&stream)window.localStorage.setItem("ninety-source:"+match.id,stream.source+"|"+stream.streamNo);},[match,stream]);
  const chooseStream=(index:number)=>{setSelected(index);setPlayerKey(key=>key+1);};
  const tryNext=()=>{if(streams.length)chooseStream((selected+1)%streams.length);};
  return <main className="watch-page">
    <header className="watch-header"><a className="brand" href="/" aria-label="Back to NINETY Live"><span>N</span><strong>NINETY</strong><em>LIVE</em></a><a className="back-link" href="/"><ArrowLeft size={17}/>All football matches</a></header>
    <div className="watch-wrap">
      <div className="watch-title"><div><span className="eyebrow"><i/> {ended?"FULL TIME":"FOOTBALL LIVE"}</span><h1>{match?`${match.home} vs ${match.away}`:"Loading match…"}</h1>{match&&<p>{match.date?new Date(match.date).toLocaleString([], {weekday:"long",hour:"numeric",minute:"2-digit"}):match.time}</p>}</div><div className="watch-badges">{match?.homeBadge&&<img src={match.homeBadge} alt={match.home} decoding="async"/>}<strong>VS</strong>{match?.awayBadge&&<img src={match.awayBadge} alt={match.away} decoding="async"/>}</div></div>
      {!ended&&<div className="provider-notice" role="note" aria-label="Advertisement warning">
        <ShieldAlert size={23}/>
        <div>
          <strong>Before you press Play</strong>
          <span>The first click may open an advertisement in a new tab. Close that tab and return here.</span>
          <span>For fewer pop-ups, enable a trusted browser ad blocker before starting the stream.</span>
        </div>
      </div>}
      <div className="watch-player">
        {stream?<iframe key={`${stream.embedUrl}-${playerKey}`} src={stream.embedUrl} title={match?`${match.home} versus ${match.away} live stream`:"Live football stream"} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen/>:ended||status==="error"||status==="scheduled"?<div className="broadcast-fallback">
          <div className="animated-pitch" aria-hidden="true"><div className="pitch-midline"/><div className="pitch-circle"/><div className="pitch-box left"/><div className="pitch-box right"/><div className="player p1"/><div className="player p2"/><div className="player p3"/><div className="player p4"/><div className="player p5"/><div className="player p6"/><div className="player p7"/><div className="player p8"/><div className="animated-ball"/></div>
          <div className="stadium-lights" aria-hidden="true"/>
          <div className="fallback-content"><CirclePlay size={48}/><span className="fallback-label">{ended?"FULL TIME":"MATCHDAY WARM-UP"}</span><strong>{ended?"This broadcast has ended":status==="scheduled"?"Broadcast starts closer to kick-off":"Broadcast temporarily unavailable"}</strong>{ended?<p>The match has finished.</p>:status==="scheduled"&&match?.date?<div className="kickoff-countdown"><small>KICK-OFF IN</small><b>{countdown(match.date,now)}</b></div>:<p>We continue checking for a playable broadcast every 60 seconds.</p>}{ended?<a className="fallback-return" href="/">Return to matches</a>:<button onClick={()=>setRetryKey(key=>key+1)}><RefreshCw size={15}/>Check broadcast now</button>}</div>
        </div>:<div className="watch-loading"><RefreshCw className="spin" size={40}/><strong>Finding available broadcast</strong><span>Checking match sources…</span></div>}
      </div>
      {!ended&&<div className="watch-toolbar"><div><strong>Broadcast sources</strong><span>{streams.length?`${streams.length} available · ${stream?.language||"Select a source"}`:status==="scheduled"?"Preparing for kick-off":"Searching for a broadcast"}</span></div><div className="watch-actions">{streams.map((item,index)=><button key={`${item.source}-${item.id}-${index}`} aria-pressed={selected===index} className={selected===index?"active":""} onClick={()=>chooseStream(index)}><Signal size={14}/><span>{item.language||`Stream ${item.streamNo}`}</span><b>{item.hd?"HD":"SD"}</b></button>)}{stream&&<button className="utility-source" onClick={tryNext}><ChevronRight size={15}/>Try next source</button>}{stream&&<button className="utility-source" onClick={()=>setPlayerKey(key=>key+1)}><RefreshCw size={14}/>Reload</button>}{stream&&<button className="utility-source" onClick={()=>document.querySelector<HTMLElement>(".watch-player")?.requestFullscreen()}><Maximize size={14}/>Fullscreen</button>}</div></div>}
      {!ended&&<p className="external-note"><ExternalLink size={14}/>If an advertisement opens, close the new tab and return to the match.</p>}
    </div>
  </main>;
}
