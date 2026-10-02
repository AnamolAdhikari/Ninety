"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, UserPlus, RefreshCw } from "lucide-react";
type Friend={id:string;username:string;enabled:number;created:number;lastLogin:number|null};
type Health={day:string;category:string;count:number};
type TelemetryEvent={id:string;account:string;event:string;detail:string|null;created:number};
export default function AdminPage(){
  const [events,setEvents]=useState<TelemetryEvent[]>([]);
  const [now,setNow]=useState(()=>Date.now());
  const [activityAccount,setActivityAccount]=useState("all");
  const [activityQuery,setActivityQuery]=useState("");
  const liveCutoff=now-90_000;
  const activeByAccount=new Map<string,TelemetryEvent>();
  for(const event of events){if(event.created<liveCutoff||event.event!=="session-active")continue;if(!activeByAccount.has(event.account))activeByAccount.set(event.account,event);}
  const watchingByAccount=new Map<string,TelemetryEvent>();
  for(const event of events){
    if(event.created<liveCutoff||event.event!=="session-active")continue;
    try{
      const detail=event.detail?JSON.parse(event.detail):{};
      if(detail.watching===true&&typeof detail.matchId==="string"&&!watchingByAccount.has(event.account))watchingByAccount.set(event.account,event);
    }catch{}
  }
  const activeAccounts=activeByAccount.size;
  const watchingAccounts=watchingByAccount.size;
  const matchesWatching=new Set(Array.from(watchingByAccount.values()).map(event=>{try{const detail=event.detail?JSON.parse(event.detail):{};return typeof detail.matchId==="string"?detail.matchId:"";}catch{return "";}}).filter(Boolean)).size;
  const activityEvents=events.filter(event=>event.event!=="session-active");
  const label=(account:string)=>account.startsWith("friend:")?"friend":account.split(":")[0];
  const parseDetail=(event:TelemetryEvent)=>{try{return event.detail?JSON.parse(event.detail) as Record<string,unknown>:{};}catch{return {} as Record<string,unknown>;}};
  const matchName=(event:TelemetryEvent)=>{const detail=parseDetail(event);return typeof detail.home==="string"&&typeof detail.away==="string"?detail.home+" vs "+detail.away:typeof detail.matchId==="string"?detail.matchId:"";};
  const humanEvent=(event:TelemetryEvent)=>{const match=matchName(event);const names:Record<string,string>={"watch-open":"Opened match","match-open":"Opened match","player-start":"Started watching","player-stop":"Stopped watching","source-change":"Changed source","source-failure":"Source failed"};return (names[event.event]??event.event.replaceAll("-"," "))+(match?" · "+match:"");};
  const filteredActivity=activityEvents.filter(event=>{
    if(activityAccount!=="all"&&label(event.account)!==activityAccount)return false;
    if(!activityQuery.trim())return true;
    const hay=(humanEvent(event)+" "+label(event.account)).toLowerCase();
    return hay.includes(activityQuery.trim().toLowerCase());
  });
  const readableActivity=filteredActivity.filter((event,index,rows)=>{
    if(event.event!=="watch-open")return true;
    return !rows.some((other,i)=>i!==index&&other.account===event.account&&other.event==="match-open"&&Math.abs(other.created-event.created)<5000);
  });
  const sessions=(()=>{
    const ordered=[...activityEvents].sort((a,b)=>a.created-b.created);
    const result:{account:string;start:number;end:number;matches:Set<string>;events:number}[]=[];
    for(const event of ordered){
      let current=result[result.length-1];
      if(!current||current.account!==event.account||event.created-current.end>30*60_000){
        current={account:event.account,start:event.created,end:event.created,matches:new Set<string>(),events:0};result.push(current);
      }
      current.end=Math.max(current.end,event.created);current.events++;
      if(event.event==="match-open"){const name=matchName(event);if(name)current.matches.add(name);}
    }
    return result.reverse().slice(0,8);
  })();
  const [services,setServices]=useState<{accounts:boolean;footballData:boolean}|null>(null);
  const [friends,setFriends]=useState<Friend[]>([]),[health,setHealth]=useState<Health[]>([]),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[resetId,setResetId]=useState<string|null>(null),[resetPassword,setResetPassword]=useState('');
  const load=async()=>{const response=await fetch('/api/admin/accounts',{cache:'no-store'});const data=await response.json() as {accounts?:Friend[];health?:Health[];services?:{accounts:boolean;footballData:boolean};error?:string};if(!response.ok)throw new Error(data.error??'Dashboard unavailable');setFriends(data.accounts??[]);setHealth(data.health??[]);setServices(data.services??null);};
  const loadTelemetry=async()=>{const response=await fetch('/api/admin/telemetry',{cache:'no-store'});const data=await response.json() as {events?:TelemetryEvent[]};if(!response.ok)throw new Error('Telemetry unavailable');setEvents(data.events??[]);setNow(Date.now());};
  useEffect(()=>{
    void load().catch(error=>setMessage(error.message));
    void loadTelemetry().catch(()=>{});
    const telemetryTimer=window.setInterval(()=>{if(!document.hidden)void loadTelemetry().catch(()=>{});},15_000);
    const clockTimer=window.setInterval(()=>setNow(Date.now()),5_000);
    const onVisibility=()=>{if(!document.hidden){setNow(Date.now());void loadTelemetry().catch(()=>{});}};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(telemetryTimer);window.clearInterval(clockTimer);document.removeEventListener('visibilitychange',onVisibility);};
  },[]);
  const mutate=async(path:string,body:object)=>{setBusy(true);setMessage('');try{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error??'Request failed');await load();setMessage('Changes saved.');return true;}catch(error){setMessage((error as Error).message);return false;}finally{setBusy(false);}};
  return <main className="admin-page"><header><a href="/"><ArrowLeft size={17}/>Back to matches</a><span><Shield size={18}/>Owner dashboard</span></header><div className="admin-intro"><span className="eyebrow">PRIVATE MATCHDAY</span><h1>Your circle. Your control.</h1><p>Create a separate login for each friend. Disabling an account or resetting its password signs it out.</p></div>
    <section className="admin-card"><h2><UserPlus size={21}/>Invite a friend</h2><form onSubmit={async event=>{event.preventDefault();if(await mutate('/api/admin/accounts',{username,password})){setUsername('');setPassword('');}}}><label>Username<input required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}" maxLength={40} value={username} onChange={e=>setUsername(e.target.value)} autoComplete="off"/></label><label>Initial password<input required type="password" minLength={12} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><button disabled={busy}>Create account</button></form><p>Share the username and password privately. Friends sign in on the existing login page.</p></section>
    {message&&<p className="admin-message" role="status">{message}</p>}
    <section className="admin-card"><div className="admin-section-heading"><h2>Friend accounts <small>{friends.length}</small></h2><button disabled={busy} onClick={()=>void load().catch(error=>setMessage(error.message))} aria-label="Refresh dashboard"><RefreshCw size={17}/></button></div>{!friends.length?<p>No individual friend accounts yet. Your existing guest login continues to work.</p>:<div className="admin-accounts">{friends.map(friend=><article key={friend.id}><div><strong>{friend.username}</strong><span>{friend.enabled?'Active':'Disabled'} · {friend.lastLogin?'Last sign-in '+new Date(friend.lastLogin).toLocaleDateString():'Has not signed in yet'}</span></div><div><button disabled={busy} onClick={()=>void mutate('/api/admin/account',{id:friend.id,enabled:!friend.enabled})}>{friend.enabled?'Disable':'Enable'}</button><button disabled={busy} onClick={()=>{setResetId(friend.id);setResetPassword('');}}>Reset password</button></div>{resetId===friend.id&&<form className="password-reset" onSubmit={async event=>{event.preventDefault();if(await mutate('/api/admin/account',{id:friend.id,password:resetPassword})){setResetId(null);setResetPassword('');}}}><label>New password<input type="password" required minLength={12} maxLength={200} value={resetPassword} onChange={e=>setResetPassword(e.target.value)} autoComplete="new-password"/></label><button disabled={busy}>Save password</button><button type="button" onClick={()=>setResetId(null)}>Cancel</button></form>}</article>)}</div>}</section>
    <section className="admin-card"><div className="admin-section-heading"><h2>Control Center · live users</h2><small>Auto-refresh · 15s · 90-second activity window</small></div><p>One row per authenticated account. No IP address, location, or browser fingerprint is stored.</p><div className="service-connections"><span>Online accounts · {activeAccounts}</span><span>Watching now · {watchingAccounts}</span><span>Matches active · {matchesWatching}</span></div>{activeAccounts>0?<div className="admin-health control-live-list">{Array.from(activeByAccount.entries()).map(([account,event])=>{const watching=watchingByAccount.get(account);const detail=parseDetail(watching??event);const match=typeof detail.home==="string"&&typeof detail.away==="string"?detail.home+" vs "+detail.away:typeof detail.matchId==="string"?detail.matchId:"";return <div key={account}><span><b>{label(account)}</b>{match?` · ${match}`:""}</span><time>{Math.max(0,Math.round((now-event.created)/1000))}s ago</time><strong>{watching?"Watching":"Online"}</strong></div>})}</div>:<p className="control-empty">Nobody is active right now.</p>}</section>
    <section className="admin-card"><div className="admin-section-heading"><h2>Control Center · recent sessions</h2><small>{sessions.length} recent sessions</small></div><p>Consecutive activity from the same account is grouped into a session, with a 30-minute inactivity boundary.</p>{sessions.length?<div className="admin-health control-session-list">{sessions.map((session,index)=><div key={session.account+session.start+index}><span><b>{label(session.account)}</b> · {session.matches.size} {session.matches.size===1?"match":"matches"} viewed · {session.events} events</span><time>{new Date(session.start).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}–{new Date(session.end).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time><strong>{Math.max(1,Math.round((session.end-session.start)/60_000))}m</strong></div>)}</div>:<p>No sessions yet.</p>}</section>
    <section className="admin-card"><div className="admin-section-heading"><h2>Control Center · recent activity</h2><small>{readableActivity.length} readable actions · {activityEvents.length} raw events</small></div><p>Duplicate page-open telemetry is collapsed into a single human-readable action. Use the raw event log only when debugging.</p><div className="control-filters"><select value={activityAccount} onChange={e=>setActivityAccount(e.target.value)} aria-label="Filter activity by account"><option value="all">All accounts</option><option value="owner">Owner</option><option value="guest">Guest</option><option value="friend">Friends</option></select><input value={activityQuery} onChange={e=>setActivityQuery(e.target.value)} placeholder="Search match or activity…" aria-label="Search recent activity"/></div>{readableActivity.length?<div className="admin-health">{readableActivity.slice(0,30).map(row=><div key={row.id}><span>{humanEvent(row)}</span><time>{new Date(row.created).toLocaleString()}</time><strong>{label(row.account)}</strong></div>)}</div>:<p>No activity matches these filters.</p>}<details className="control-raw"><summary>Raw telemetry · {events.length} events</summary><div className="admin-health">{events.slice(0,50).map(row=><div key={row.id}><span>{row.event.replaceAll("-"," ")}{matchName(row)?` · ${matchName(row)}`:""}</span><time>{new Date(row.created).toLocaleString()}</time><strong>{label(row.account)}</strong></div>)}</div></details></section>    <section className="admin-card"><h2>Service health · past 7 days</h2>{services&&<div className="service-connections"><span>Account storage · {services.accounts?"Connected":"Unavailable"}</span><span>Match data · {services.footballData?"Key configured":"Key not configured"}</span></div>}<p>Aggregate API failures, empty source responses and reported source retries. These do not measure video playback or prove a broadcast is broken.</p>{health.length?<div className="admin-health">{health.map(row=><div key={row.day+row.category}><span>{row.category.replaceAll('-',' ')}</span><time>{row.day} UTC</time><strong>{row.count}</strong></div>)}</div>:<p>No recorded service issues.</p>}</section><style>{`
.control-filters{display:flex;gap:10px;margin:16px 0 6px}.control-filters select,.control-filters input{min-height:42px;border:1px solid #35485a;border-radius:8px;padding:10px 12px;color:#eef4fa;background:#09121b;font:inherit}.control-filters select{min-width:150px}.control-filters input{flex:1}.control-empty{margin-bottom:0}.control-live-list{margin-top:14px}.control-live-list b,.control-session-list b{color:#eef4fa}.control-raw{margin-top:20px;border-top:1px solid #29394a;padding-top:16px}.control-raw summary{cursor:pointer;color:#9dadbf;font-size:.82rem;font-weight:700}.control-raw[open] summary{margin-bottom:8px;color:#d4ff43}
@media(max-width:640px){.control-filters{flex-direction:column}.control-filters select{width:100%}.admin-section-heading{align-items:flex-start;gap:8px;flex-wrap:wrap}.admin-section-heading small{color:#8fa2b7}}
`}</style></main>;
}
