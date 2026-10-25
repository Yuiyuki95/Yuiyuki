import {BUILTIN_SOURCES,isAnime,isTodayAnime,localDay,mergeMovies,sourceTime,UPDATE_TIMEZONE,type OnlineFeed} from '@/lib/online';
import {normalizeItems,type Movie,type Source} from '@/lib/catalog';
import {validFormat} from '@/lib/catalog-formats';
import {fetchCatalog,type CatalogPayload} from '@/lib/source-fetch';
const feedCache=new Map<string,{until:number;value:OnlineFeed}>();
const categoryCache=new Map<string,{until:number;classes:CatalogPayload['class']}>();
async function fromSource(source:Source){
 const recent=await fetchCatalog(source.url,'',{hours:48,format:source.format});
 let classes=recent.class;
 if(!classes.length&&(recent.format==='cms-json'||recent.format==='cms-xml')){const cached=categoryCache.get(source.url);if(cached&&cached.until>Date.now())classes=cached.classes;else{try{classes=(await fetchCatalog(source.url,'',{action:'list',format:source.format})).class;categoryCache.set(source.url,{until:Date.now()+3600000,classes});}catch{classes=[];}}}
 const anime=classes.filter(c=>/动漫|动画|番剧/i.test(c.type_name));
 const leaves=anime.filter(c=>!anime.some(child=>String(child.type_pid)===String(c.type_id)));
 const specific=leaves.filter(c=>!/^动漫片?$/.test(c.type_name));
 const chosen=(specific.length?specific:leaves).sort((a,b)=>{const score=(name:string)=>/日韩|日本/.test(name)?0:/国产/.test(name)?1:/欧美/.test(name)?2:3;return score(a.type_name)-score(b.type_name);}).slice(0,3);
 const details=await Promise.allSettled(chosen.map(c=>fetchCatalog(source.url,'',{type:String(c.type_id),hours:48,format:source.format})));
 const typed=details.flatMap(r=>r.status==='fulfilled'?normalizeItems(r.value,source).filter(isAnime):[]);
 const raw=normalizeItems(recent,source);
 return {recent:raw,all:[...raw,...typed],partial:details.filter(r=>r.status==='rejected').length};
}
export async function GET(request:Request){
 const url=new URL(request.url);let sources:Source[];
 try{const value=url.searchParams.get('sources');if(value&&value.length>7000)throw Error();sources=value?JSON.parse(value):BUILTIN_SOURCES.slice(0,3);if(!Array.isArray(sources)||sources.length>4||sources.some(s=>!s||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.url!=='string'||s.url.length>2048||s.format&&!validFormat(s.format)))throw Error();sources=sources.filter(s=>s.enabled!==false).slice(0,3);}catch{return Response.json({error:'视频源列表无效'},{status:400});}
 const key=localDay()+JSON.stringify(sources.map(s=>[s.id,s.url,s.format]));const cached=feedCache.get(key);
 if(cached&&cached.until>Date.now()&&url.searchParams.get('fresh')!=='1')return Response.json(cached.value,{headers:{'Cache-Control':'no-store'}});
 const responses=await Promise.allSettled(sources.map(fromSource));const recent:Movie[]=[],all:Movie[]=[];
 const states=responses.map((r,i)=>{if(r.status==='fulfilled'){recent.push(...r.value.recent);all.push(...r.value.all);return{id:sources[i].id,name:sources[i].name,ok:true,count:r.value.recent.length,...(r.value.partial?{error:`${r.value.partial} 个动漫分类暂未返回`}:{})};}return{id:sources[i].id,name:sources[i].name,ok:false,count:0,error:r.reason instanceof Error?r.reason.message:'暂时无法连接'};});
 const newest=(a:Movie,b:Movie)=>sourceTime(b.updatedAt)-sourceTime(a.updatedAt);
 const value:OnlineFeed={items:mergeMovies(recent.sort(newest)).slice(0,60),today:mergeMovies(all.filter(m=>isTodayAnime(m)).sort(newest)).slice(0,80),checkedAt:new Date().toISOString(),date:localDay(),timezone:UPDATE_TIMEZONE,sources:states};
 if(states.some(s=>s.ok)){if(feedCache.size>30)feedCache.clear();feedCache.set(key,{until:Date.now()+240000,value});}
 return Response.json(value,{headers:{'Cache-Control':'no-store'}});
}
