import {decodeCatalog,type CatalogPayload} from './catalog-formats';
import {type SourceFormat} from './catalog';
// Public HTTPS only. Validate every redirect; never forward cookies or credentials.
export function publicAddress(ip:string):boolean{
 if(ip.includes(':'))return /^2[0-9a-f]{3}:/i.test(ip)&&!/^2001:(db8|0*:)/i.test(ip);
 const p=ip.split('.').map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
 const [a,b,c]=p;return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export function validateTarget(value:string){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')throw Error('仅支持公开的 HTTPS 接口（443 端口）');
 const h=u.hostname.toLowerCase();if(!/^[a-z0-9.-]+$/.test(h)||!h.includes('.')||/^\d+(\.\d+){3}$/.test(h)||h.endsWith('.')||['.localhost','.local','.internal','.lan','.home','.test','.invalid','.example'].some(x=>h.endsWith(x)))throw Error('不支持本地、内网或 IP 地址接口');
 return u;
}
async function checkDNS(host:string,signal:AbortSignal){
 const records=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'},signal});if(!r.ok)throw Error('无法验证源站地址');const j=await r.json() as {Answer?:{type:number;data:string}[]};return (j.Answer||[]).filter(x=>x.type===1||x.type===28).map(x=>x.data);}));
 const addresses=records.flat();if(!addresses.length||addresses.some(ip=>!publicAddress(ip)))throw Error('源站地址无法解析，或指向受限制的网络');
}
export {type CatalogPayload} from './catalog-formats';
export type CatalogOptions={action?:'list'|'videolist';type?:string;hours?:number;page?:number;id?:string;format?:SourceFormat};
const dnsCache=new Map<string,number>();
export async function fetchPublic(value:string,signal:AbortSignal,accept='*/*'){
 let target=validateTarget(value);
 for(let i=0;i<4;i++){
  if((dnsCache.get(target.hostname)||0)<Date.now()){
   try{await checkDNS(target.hostname,signal);}catch(e){throw Error(`源站 DNS 校验失败：${e instanceof Error?e.message:'网络错误'}`);}
   if(dnsCache.size>128)dnsCache.clear();dnsCache.set(target.hostname,Date.now()+60000);
  }
  let response:Response;try{response=await fetch(target,{signal,redirect:'manual',headers:{Accept:accept,'User-Agent':'KEN-TV/1.0'}});}catch(e){throw Error(`源站请求失败：${e instanceof Error?e.message:'网络错误'}`);}
  if(response.status>=300&&response.status<400){const loc=response.headers.get('location');if(!loc)throw Error('源站重定向无效');target=validateTarget(new URL(loc,target).href);continue;}
  if(!response.ok)throw Error(`源站返回 ${response.status}，请检查接口地址`);
  return {response,url:target.href};
 }
 throw Error('源站重定向次数过多');
}
export async function readBounded(response:Response,max:number){
 const reader=response.body?.getReader();if(!reader)throw Error('接口返回空内容');let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw Error('返回内容超过大小限制');chunks.push(value);}}catch(e){await reader.cancel();throw e;}
 const raw=new Uint8Array(size);let at=0;for(const chunk of chunks){raw.set(chunk,at);at+=chunk.byteLength;}return raw;
}
export async function fetchCatalog(value:string,q:string,options:CatalogOptions={}):Promise<CatalogPayload>{
 const target=validateTarget(value),format=options.format||'auto';
 const staticFeed=format==='json-feed'||format==='m3u'||format==='auto'&&/\.(json|m3u|m3u8)(?:$)/i.test(target.pathname);
 if(!staticFeed){for(const key of ['ac','wd','t','h','pg','ids'])target.searchParams.delete(key);target.searchParams.set('ac',options.action||'videolist');if(format==='cms-xml')target.searchParams.set('at','xml');if(format==='cms-json')target.searchParams.set('at','json');if(options.type)target.searchParams.set('t',options.type);if(options.hours)target.searchParams.set('h',String(Math.min(168,Math.max(1,options.hours))));if(options.page)target.searchParams.set('pg',String(Math.min(20,Math.max(1,options.page))));if(options.id)target.searchParams.set('ids',options.id);if(q)target.searchParams.set('wd',q.slice(0,120));else target.searchParams.delete('wd');}
 const {response}=await fetchPublic(target.href,AbortSignal.timeout(14000),'application/json, application/xml, text/plain');
 const body=decodeCatalog(new TextDecoder().decode(await readBounded(response,3000000)),format);
 if(staticFeed||body.format==='m3u'||body.format==='json-feed'){const word=q.normalize('NFKC').toLowerCase();body.list=body.list.filter(v=>(!word||String(v.vod_name).normalize('NFKC').toLowerCase().includes(word))&&(!options.id||String(v.vod_id)===options.id));}
 return body;
}
