"use client";
import { useEffect, useRef } from "react";

type EventName="session-active"|"watch-open"|"match-open"|"player-start"|"player-stop"|"source-change"|"source-failure";
export function telemetry(event:EventName,detail:Record<string,unknown>={}){
  const body=JSON.stringify({event,detail});
  try{
    if(event==="player-stop"&&navigator.sendBeacon){navigator.sendBeacon("/api/telemetry",new Blob([body],{type:"application/json"}));return;}
    void fetch("/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>{});
  }catch{}
}
export function WatchOpenTelemetry({requestedMatchId}:{requestedMatchId:string}){const sent=useRef(false);useEffect(()=>{if(sent.current)return;sent.current=true;telemetry("watch-open",{requestedMatchId});},[requestedMatchId]);return null;} 
export function MatchTelemetry({matchId,home,away,playing,source}:{matchId:string;home:string;away:string;playing:boolean;source?:string}){
  const opened=useRef(false),lastSource=useRef<string|undefined>(undefined);
  useEffect(()=>{if(opened.current)return;opened.current=true;telemetry("match-open",{matchId,home,away});},[matchId,home,away]);
  useEffect(()=>{if(!playing)return;telemetry("player-start",{matchId,source});return()=>telemetry("player-stop",{matchId,source});},[matchId,playing]);
  useEffect(()=>{if(!playing||!source)return;if(lastSource.current&&lastSource.current!==source)telemetry("source-change",{matchId,from:lastSource.current,to:source});lastSource.current=source;},[matchId,playing,source]);
  useEffect(()=>{if(!playing)return;const pulse=()=>{if(!document.hidden)telemetry("session-active",{matchId,source});};pulse();const timer=window.setInterval(pulse,60000);return()=>window.clearInterval(timer);},[matchId,playing,source]);
  return null;
}
