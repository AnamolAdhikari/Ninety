import { recordHealth } from "../../service-health";
const API = "https://streamed.pk";
type RawStream={id?:unknown;streamNo?:unknown;language?:unknown;hd?:unknown;embedUrl?:unknown;source?:unknown};
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;
function safeEmbedUrl(value:string){
  try{
    const parsed=new URL(value),host=parsed.hostname.toLowerCase().replace(/\\.$/,"");
    if(parsed.protocol!=="https:"||parsed.username||parsed.password||(parsed.port&&parsed.port!=="443"))return null;
    if(!host.includes(".")||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal"))return null;
    if(/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(host)||host.includes(":"))return null;
    if(host.length>253||!host.split(".").every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return null;
    return parsed.toString();
  }catch{return null;}
}

export async function GET(request:Request){
  const url=new URL(request.url), source=clean(url.searchParams.get("source")).toLowerCase(), id=clean(url.searchParams.get("id"));
  if(!/^[a-z0-9-]{1,32}$/.test(source)||!id||id.length>180||!/^[a-zA-Z0-9._~-]+$/.test(id))return Response.json({error:"Invalid stream reference."},{status:400});
  try{
    const response=await fetch(`${API}/api/stream/${source}/${encodeURIComponent(id)}`,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!response.ok){await recordHealth("stream-api-error");return Response.json({streams:[],error:"Source provider temporarily unavailable."},{status:502});}
    const raw=await response.json() as RawStream[];
    const streams=raw.flatMap((stream,index)=>{
      const embedUrl=safeEmbedUrl(clean(stream.embedUrl));
      if(!embedUrl)return [];
      return [{id:clean(stream.id,`${source}-${index}`),streamNo:Number(stream.streamNo)||index+1,language:clean(stream.language,"Stream"),hd:Boolean(stream.hd),embedUrl,source:clean(stream.source,source)}];
    }).slice(0,12);
    if(!streams.length)await recordHealth("stream-unavailable");
    return Response.json({streams},{headers:{"Cache-Control":"no-store"}});
  }catch{await recordHealth("stream-api-error");return Response.json({streams:[],error:"Source provider temporarily unavailable."},{status:502});}
}
