"use client";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export function MatchPresenceBadge({matchId}:{matchId:string}) {
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{
    let visitor=crypto.randomUUID();
    // Share an anonymous ID across tabs for one day to avoid counting the same browser twice.
    try {const stored=JSON.parse(localStorage.getItem("ninety-presence")||"null") as {id:string;expires:number}|null;
      if(stored?.expires && stored.expires>Date.now() && /^[0-9a-f-]{36}$/i.test(stored.id))visitor=stored.id;
      else localStorage.setItem("ninety-presence",JSON.stringify({id:visitor,expires:Date.now()+86400000}));
    }catch{}
    const tab=crypto.randomUUID();let stopped=false,inFlight=false;
    const payload=(leave=false)=>JSON.stringify({match:matchId,visitor,tab,leave});
    const leave=()=>{navigator.sendBeacon?.("/api/presence",new Blob([payload(true)],{type:"application/json"}));};
    const pulse=async()=>{
      if(stopped||document.hidden||inFlight)return;
      inFlight=true;
      try {const response=await fetch("/api/presence",{method:"POST",headers:{"Content-Type":"application/json"},body:payload(),signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error();const data=await response.json() as {count?:number};
        if(!stopped)setCount(typeof data.count==="number"&&Number.isInteger(data.count)&&data.count>0?data.count:null);
      }catch{if(!stopped)setCount(null);}finally{inFlight=false;}
    };
    const visibility=()=>{if(document.hidden){setCount(null);leave();}else void pulse();};
    void pulse();const timer=window.setInterval(()=>void pulse(),30000);
    document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",leave);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",leave);leave();};
  },[matchId]);
  if(count===null)return null;
  return <span className="match-presence" title="Active browsers on this match page, updated about every 30 seconds. This does not measure video playback."><Users size={14} aria-hidden="true"/><span>{count.toLocaleString()} here now</span></span>;
}
