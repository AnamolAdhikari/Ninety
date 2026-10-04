"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function pulse(){
  if(document.hidden)return;
  void fetch("/api/telemetry",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({event:"session-active",detail:{watching:false}}),
    keepalive:true,
  }).catch(()=>{});
}

export default function SessionTelemetry(){
  const pathname=usePathname();
  useEffect(()=>{
    // The owner dashboard observes activity; it should not count itself as a viewer.
    // Watch pages send their own richer heartbeat with match context.
    if(pathname.startsWith("/admin")||pathname.startsWith("/watch"))return;
    pulse();
    const timer=window.setInterval(pulse,60_000);
    const onVisibility=()=>{if(!document.hidden)pulse();};
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[pathname]);
  return null;
}
