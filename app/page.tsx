"use client";

import { CirclePlay, Radio, RefreshCw, Search, Signal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isEffectivelyLive, isMatchEnded } from "./match-lifecycle";

type ApiSource={source:string;id:string};
type Match={
  id:string;sport:string;league:string;home:string;away:string;
  homeCode:string;awayCode:string;time:string;date?:number;live?:boolean;
  colorA:string;colorB:string;apiSources?:ApiSource[];homeBadge?:string;awayBadge?:string;
};
type Filter="all"|"live"|"today"|"upcoming";

const palettes=[
  ["#776600","#006b91"],["#075b34","#082f21"],["#90142c","#8b7400"],
  ["#174b7d","#192b4e"],["#703b0d","#71171b"],["#472b7c","#19545a"],
] as const;

function TeamMark({code,color,badge,name}:{code:string;color:string;badge?:string;name:string}){
  return <span className="team-mark" style={{"--team-color":color} as React.CSSProperties}>{badge?<img src={badge} alt={name+" badge"} loading="lazy" decoding="async"/>:code.slice(0,2)}</span>;
}

function sameLocalDay(timestamp:number,now:number){
  const a=new Date(timestamp),b=new Date(now);
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}

function countdown(timestamp:number,now:number){
  const distance=timestamp-now;
  if(distance<=0)return "Starting soon";
  const minutes=Math.floor(distance/60000),days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;
  if(days>0)return days+"d "+hours+"h";
  if(hours>0)return hours+"h "+mins+"m";
  return Math.max(1,mins)+"m";
}

export default function Home(){
  const [matches,setMatches]=useState<Match[]>([]),[feedStatus,setFeedStatus]=useState<"loading"|"live"|"error">("loading");
  const [filter,setFilter]=useState<Filter>("all"),[query,setQuery]=useState(""),[now,setNow]=useState(Date.now());
  const [scrolled,setScrolled]=useState(false),[refreshing,setRefreshing]=useState(false);

  const loadMatches=useCallback(async(silent=false)=>{
    if(!silent)setFeedStatus("loading");else setRefreshing(true);
    try{
      const response=await fetch("/api/matches",{cache:"no-store"});if(!response.ok)throw new Error();
      const data=await response.json() as {matches?:Match[]};
      setMatches(data.matches??[]);setFeedStatus("live");
    }catch{setFeedStatus("error");}
    finally{setRefreshing(false);}
  },[]);

  useEffect(()=>{void loadMatches();const refresh=window.setInterval(()=>void loadMatches(true),60000);const clock=window.setInterval(()=>setNow(Date.now()),30000);return()=>{window.clearInterval(refresh);window.clearInterval(clock);};},[loadMatches]);
  useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>24);onScroll();window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);

  const counts=useMemo(()=>({
    all:matches.length,
    live:matches.filter(match=>isEffectivelyLive(match,now)).length,
    today:matches.filter(match=>match.date&&sameLocalDay(match.date,now)).length,
    upcoming:matches.filter(match=>!isEffectivelyLive(match,now)&&Boolean(match.date&&match.date>now)).length,
  }),[matches,now]);

  const visible=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    return matches.filter(match=>{
      const matchesSearch=!term||(match.home+" "+match.away+" "+match.league).toLocaleLowerCase().includes(term);
      const matchesFilter=filter==="all"||filter==="live"&&isEffectivelyLive(match,now)||filter==="today"&&Boolean(match.date&&sameLocalDay(match.date,now))||filter==="upcoming"&&Boolean(!isEffectivelyLive(match,now)&&match.date&&match.date>now);
      return matchesSearch&&matchesFilter;
    }).sort((a,b)=>{
      const aEnded=isMatchEnded(a,now),bEnded=isMatchEnded(b,now);
      return Number(isEffectivelyLive(b,now))-Number(isEffectivelyLive(a,now))||Number(aEnded)-Number(bEnded)||Number(Boolean(b.apiSources?.length))-Number(Boolean(a.apiSources?.length))||(a.date??0)-(b.date??0);
    });
  },[matches,filter,query,now]);

  return <main>
    <header className={"site-header catalog-header "+(scrolled?"compact":"")}>
      <a className="brand" href="#top" aria-label="NINETY Live home"><span>N</span><strong>NINETY</strong><em>LIVE</em></a>
      <nav aria-label="Primary navigation"><a className="active" href="#matches">Matches</a><a href="#matches" onClick={()=>setFilter("live")}>Live</a></nav>
      <span className="catalog-status"><i/>Live football</span>
    </header>
    <section className="ticker" aria-label="Live event ticker"><span className="ticker-label"><Radio size={16}/>{counts.live?counts.live+" LIVE":"FOOTBALL"}</span><div className="ticker-track">{matches.filter(match=>!isMatchEnded(match,now)).slice(0,8).map(match=><a key={match.id} href={"/watch?match="+encodeURIComponent(match.id)}><b>{match.homeCode}</b><span>{match.home+" vs "+match.away+" · "+(isEffectivelyLive(match,now)?"LIVE":match.time)}</span></a>)}</div><span className="local-time">Auto-refresh on</span></section>

    <div className="page-wrap catalog-page" id="top">
      <section className="match-catalog" id="matches">
        <div className="catalog-title"><div><span className="eyebrow"><i/> LIVE &amp; UPCOMING</span><h1>Football</h1><p>Choose a match and start watching.</p></div><button className="feed-refresh" onClick={()=>void loadMatches(true)} disabled={refreshing} aria-label="Refresh matches"><RefreshCw className={refreshing?"spin":""} size={16}/>{refreshing?"Refreshing…":"Refresh"}</button></div>

        <div className="catalog-tools">
          <div className="catalog-tabs" role="tablist" aria-label="Match filters">
            {(["all","live","today","upcoming"] as Filter[]).map(item=><button key={item} role="tab" aria-selected={filter===item} className={filter===item?"active":""} onClick={()=>setFilter(item)}><span>{item==="all"?"All":item[0].toUpperCase()+item.slice(1)}</span><b>{counts[item]}</b></button>)}
          </div>
          <label className="match-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search available broadcasts" aria-label="Search available broadcasts"/>{query&&<button onClick={()=>setQuery("")} aria-label="Clear search"><X size={16}/></button>}</label>
        </div>

        {feedStatus==="loading"?<div className="featured-match-grid" aria-label="Loading football matches">{[0,1,2].map(item=><div className="featured-match-card card-skeleton" key={item}><div/><span/><span/></div>)}</div>:visible.length?<div className="featured-match-grid">{visible.map((match,index)=>{
          const [colorA,colorB]=palettes[index%palettes.length],ended=isMatchEnded(match,now),live=isEffectivelyLive(match,now);
          const status=ended?"ENDED":live?"LIVE":match.date&&match.date>now?"IN "+countdown(match.date,now):"UPCOMING";
          return <a className={"featured-match-card "+(ended?"ended":"")} key={match.id} href={"/watch?match="+encodeURIComponent(match.id)} style={{"--card-a":colorA,"--card-b":colorB,"--delay":Math.min(index,8)*45+"ms"} as React.CSSProperties}>
            <div className="featured-match-art"><span className={live?"featured-state live":"featured-state"}>{status}</span><div className="featured-clubs"><TeamMark code={match.homeCode} color={match.colorA} badge={match.homeBadge} name={match.home}/><strong>VS</strong><TeamMark code={match.awayCode} color={match.colorB} badge={match.awayBadge} name={match.away}/></div></div>
            <div className="featured-match-info"><h2>{match.home} <span>vs.</span> {match.away}</h2><div className="match-meta"><span>{match.league||"Football"}</span><b className={live?"is-live":""}>{ended?"Broadcast ended":live?<><i/> Watch live</>:match.date?new Date(match.date).toLocaleString([], {weekday:"short",hour:"numeric",minute:"2-digit"}):match.time}</b></div><div className="match-card-bottom"><span><Signal size={13}/>{ended?"Broadcast ended":match.apiSources?.length?(match.apiSources.length+" source"+(match.apiSources.length===1?"":"s")):"Awaiting source"}</span><span className="featured-cta">{live?"Watch now":"View match"}<CirclePlay size={15}/></span></div></div>
          </a>;
        })}</div>:<div className="catalog-empty"><CirclePlay size={40}/><h2>{query?"No matching football games":"No matches in this view"}</h2><p>{query?"Try another team or competition.":"Choose another filter or check again shortly."}</p>{(query||filter!=="all")&&<button onClick={()=>{setQuery("");setFilter("all");}}>Show all matches</button>}</div>}
      </section>
    </div>
    <footer className="site-footer">
      <div className="footer-main"><a className="brand small" href="#top"><span>N</span><strong>NINETY</strong><em>LIVE</em></a><p>Live football, made simple.</p></div>
      <div className="footer-rule"/>
      <div className="footer-bottom"><span>© 2026 NINETY Live. All rights reserved.</span><span>Independent football viewing platform.</span></div>
    </footer>
  </main>;
}
