import { recordHealth } from "../../service-health";

const PPV_API="https://api.ppv.st/api/streams";
type PpvSource={iframe?:unknown;embed_url?:unknown;source_tag?:unknown;tag?:unknown;language?:unknown;hd?:unknown;id?:unknown};
type PpvEvent={id?:unknown;name?:unknown;tag?:unknown;iframe?:unknown;substreams?:PpvSource[]};
type PpvPayload={streams?:Array<{category?:string;streams?:PpvEvent[]}>};
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;

function safeEmbedUrl(value:string){
  try{
    const parsed=new URL(value);
    const host=parsed.hostname.toLowerCase().replace(/\.$/,"");
    if(parsed.protocol!=="https:"||parsed.username||parsed.password||(parsed.port&&parsed.port!=="443"))return null;
    if(!host.includes(".")||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal"))return null;
    if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)||host.includes(":"))return null;
    if(host.length>253||!host.split(".").every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return null;
    return parsed.toString();
  }catch{return null;}
}

export async function GET(request:Request){
  const url=new URL(request.url),source=clean(url.searchParams.get("source")).toLowerCase(),id=clean(url.searchParams.get("id"));
  if(source!=="ppv"||!id||id.length>180||!/^[a-zA-Z0-9._~-]+$/.test(id)){
    return Response.json({streams:[],error:"Invalid or unsupported broadcast reference."},{status:400});
  }
  try{
    const response=await fetch(PPV_API,{headers:{Accept:"application/json"},next:{revalidate:60},signal:AbortSignal.timeout(8000)});
    if(!response.ok){
      console.warn("[ninety:ppv] catalogue HTTP",JSON.stringify({status:response.status,contentType:response.headers.get("content-type")}));
      await recordHealth("stream-api-error");
      return Response.json({streams:[],error:"PPV.ST catalogue temporarily unavailable."},{status:502});
    }
    const contentType=response.headers.get("content-type")?.toLowerCase()??"";
    if(!contentType.includes("application/json"))throw new Error("ppv-non-json");
    const payload=await response.json() as PpvPayload;
    if(!Array.isArray(payload.streams))throw new Error("ppv-invalid-catalogue");
    const events=payload.streams.flatMap(group=>Array.isArray(group.streams)?group.streams:[]);
    const event=events.find(item=>String(item.id??"")===id);
    if(!event)return Response.json({streams:[],error:"PPV.ST has no matching event."},{status:404,headers:{"Cache-Control":"no-store"}});
    const candidates:PpvSource[]=[
      {iframe:event.iframe,tag:event.tag,source_tag:"Main source"},
      ...(Array.isArray(event.substreams)?event.substreams:[])
    ];
    const seen=new Set<string>();
    const streams=candidates.flatMap((item,index)=>{
      const raw=clean(item.iframe)||clean(item.embed_url);
      const embedUrl=safeEmbedUrl(raw);
      if(!embedUrl||seen.has(embedUrl))return [];
      seen.add(embedUrl);
      const label=clean(item.language)||clean(item.source_tag)||clean(item.tag)||clean(event.tag)||"PPV.ST";
      return [{id:clean(item.id,id+"-"+(index+1)),streamNo:index+1,language:label,hd:Boolean(item.hd)||/\bhd\b/i.test(label),embedUrl,source:"ppv"}];
    }).slice(0,12);
    if(!streams.length)await recordHealth("stream-unavailable");
    return Response.json({streams,provider:"PPV.ST"},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.warn("[ninety:ppv] catalogue exception",JSON.stringify({category:error instanceof Error?error.name:"unknown"}));
    await recordHealth("stream-api-error");
    return Response.json({streams:[],error:"PPV.ST broadcast lookup failed."},{status:502});
  }
}
