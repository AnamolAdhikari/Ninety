"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type MatchEvent={minute:number|null;extra:number|null;team:string;player:string;assist:string;type:string;detail:string};
type Details={status:'available'|'unavailable';checkedAt?:number;message?:string;events?:MatchEvent[]};

const eventKey=(event:MatchEvent)=>[event.minute,event.extra,event.team,event.player,event.type,event.detail].join("|");

export function MatchEvents({home,away,date,ended,active}:{home:string;away:string;date:number;ended:boolean;active:boolean}){
  const [data,setData]=useState<Details|null>(null),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0),[fresh,setFresh]=useState<Set<string>>(new Set());
  const previous=useRef<Set<string>>(new Set());

  useEffect(()=>{
    if(!active&&!ended){setData({status:'available',message:'Match events will appear once the match is live.',events:[]});return;}
    let cancelled=false;
    const load=async()=>{
      if(document.hidden)return;
      setLoading(true);
      try{
        const response=await fetch('/api/match-details?'+new URLSearchParams({home,away,date:String(date)}),{cache:'no-store'});
        if(!response.ok)throw new Error();
        const result=await response.json() as Details;
        if(cancelled)return;
        const keys=new Set((result.events??[]).map(eventKey));
        if(previous.current.size){
          const added=new Set([...keys].filter(key=>!previous.current.has(key)));
          setFresh(added);
          if(added.size)window.setTimeout(()=>setFresh(new Set()),5000);
        }
        previous.current=keys;
        setData(result);
      }catch{
        if(!cancelled)setData({status:'unavailable',message:'Live match data is temporarily unavailable.'});
      }finally{
        if(!cancelled)setLoading(false);
      }
    };
    void load();
    const timer=active&&!ended?window.setInterval(()=>void load(),30000):undefined;
    const onVisibility=()=>{if(document.visibilityState==='visible'&&active&&!ended)void load();};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelled=true;if(timer)window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
  },[home,away,date,ended,active,retry]);

  const events=[...(data?.events??[])].sort((a,b)=>((b.minute??-1)*100+(b.extra??0))-((a.minute??-1)*100+(a.extra??0)));
  return <section id="events-panel" role="tabpanel" aria-labelledby="events-tab" className="match-events-panel">
    <div className="match-events-heading">
      <div>
        <div className="match-events-title-row"><h2>Match timeline</h2>{active&&!ended&&<span className="live-ticker-badge"><i/>LIVE</span>}</div>
        <p>{data?.checkedAt?'Updated '+new Date(data.checkedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):active&&!ended?'Live goals, cards, VAR and substitutions':'Reported goals, cards and substitutions'}</p>
      </div>
      <button disabled={loading||(!active&&!ended)} onClick={()=>setRetry(x=>x+1)}><RefreshCw size={15}/>{loading?'Checking…':'Refresh'}</button>
    </div>
    {data?.status==='available'&&events.length?<ol>{events.map((event,index)=>{const key=eventKey(event);return <li key={key||index} className={fresh.has(key)?'event-new':''}><time>{event.minute??'—'}{event.extra?'+'+event.extra:''}′</time><div><strong>{event.type==='subst'?'Substitution':event.detail||event.type}</strong><span>{event.player}{event.assist?(event.type==='subst'?' → ':' · Assist: ')+event.assist:''}</span><small>{event.team}</small></div></li>;})}</ol>:<p className="match-events-empty">{!data?'Checking live match reports…':data.message??'No match events have been reported by the connected provider yet.'}</p>}
    <small className="match-events-credit">API-Football reports · Live updates are cached to protect the provider allowance.</small>
  </section>;
}
