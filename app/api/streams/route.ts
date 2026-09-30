import { recordHealth } from "../../service-health";
const API = "https://streamed.pk";
type RawStream={id?:unknown;streamNo?:unknown;language?:unknown;hd?:unknown;embedUrl?:unknown;source?:unknown};
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;

export async function GET(request:Request){
  const url=new URL(request.url), source=clean(url.searchParams.get("source")).toLowerCase(), id=clean(url.searchParams.get("id"));
  if(!/^[a-z0-9-]{1,32}$/.test(source)||!id||id.length>180||!/^[a-zA-Z0-9._~-]+$/.test(id))return Response.json({error:"Invalid stream reference."},{status:400});
  try{
    const response=await fetch(`${API}/api/stream/${source}/${encodeURIComponent(id)}`,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!response.ok){await recordHealth("stream-api-error");return Response.json({streams:[],error:"Source provider temporarily unavailable."},{status:502});}
    const raw=await response.json() as RawStream[];
    const streams=raw.flatMap((stream,index)=>{
      const embedUrl=clean(stream.embedUrl);
      try{const parsed=new URL(embedUrl);if(parsed.protocol!=="https:")return [];}catch{return [];}
      return [{id:clean(stream.id,`${source}-${index}`),streamNo:Number(stream.streamNo)||index+1,language:clean(stream.language,"Stream"),hd:Boolean(stream.hd),embedUrl,source:clean(stream.source,source)}];
    }).slice(0,12);
    if(!streams.length)await recordHealth("stream-unavailable");
    return Response.json({streams},{headers:{"Cache-Control":"no-store"}});
  }catch{await recordHealth("stream-api-error");return Response.json({streams:[],error:"Source provider temporarily unavailable."},{status:502});}
}
