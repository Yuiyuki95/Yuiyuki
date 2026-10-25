import {plainText,safeMedia,type SourceFormat} from './catalog';
export type CatalogPayload={list:Record<string,unknown>[];class:{type_id:number|string;type_name:string;type_pid?:number|string}[];pagecount:number;format?:SourceFormat};
export const validFormat=(value:unknown):value is SourceFormat=>['auto','cms-json','cms-xml','json-feed','m3u'].includes(String(value));
const text=(xml:string,tag:string)=>{const match=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return match?plainText(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')):'';};
function xmlPayload(raw:string):CatalogPayload{
 if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('XML 包含不支持的实体声明');
 if(!/<rss[\s>]|<list[\s>]/i.test(raw))throw Error('不是兼容的苹果 CMS XML');
 const list=Array.from(raw.matchAll(/<video(?:\s[^>]*)?>([\s\S]*?)<\/video>/gi)).slice(0,500).map(([,v])=>({vod_id:text(v,'id'),vod_name:text(v,'name'),type_name:text(v,'type'),vod_year:text(v,'year'),vod_pic:text(v,'pic'),vod_content:text(v,'des'),vod_time:text(v,'last'),vod_remarks:text(v,'note'),vod_play_url:Array.from(v.matchAll(/<dd(?:\s[^>]*)?>([\s\S]*?)<\/dd>/gi)).map(([,line])=>plainText(line.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'))).join('$$$')}));
 const classes=Array.from((raw.match(/<class[^>]*>([\s\S]*?)<\/class>/i)?.[1]||'').matchAll(/<ty\b([^>]*)>([\s\S]*?)<\/ty>/gi)).map(([,attrs,name])=>({type_id:attrs.match(/\bid=["'](\d+)["']/)?.[1]||'',type_name:plainText(name),type_pid:attrs.match(/\bpid=["'](\d+)["']/)?.[1]})).filter(c=>c.type_id);
 return {list,class:classes,pagecount:Math.min(10000,Number(raw.match(/\bpagecount=["'](\d+)["']/i)?.[1])||1),format:'cms-xml'};
}
function m3uPayload(raw:string):CatalogPayload{
 const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/);if(lines[0]?.trim()!=='#EXTM3U')throw Error('播放列表必须以 #EXTM3U 开始');
 if(raw.includes('#EXT-X-TARGETDURATION')||raw.includes('#EXT-X-STREAM-INF'))throw Error('这是单部视频的 M3U8，请使用「链接播放」');
 const list:Record<string,unknown>[]=[];let name='',group='',image='';
 for(const line of lines){const s=line.trim();if(s.startsWith('#EXTINF:')){name=plainText(s.replace(/^#EXTINF:[^,]*,/,''));group=plainText(s.match(/group-title="([^"]*)"/)?.[1]);image=safeMedia(s.match(/tvg-logo="([^"]*)"/)?.[1]);}else if(s&&!s.startsWith('#')){const url=safeMedia(s);if(url)list.push({vod_id:String(list.length+1),vod_name:name||`视频 ${list.length+1}`,type_name:group||'播放列表',vod_pic:image,vod_play_url:`播放$${url}`,vod_remarks:'播放列表'});name=group=image='';if(list.length>=500)break;}}
 return {list,class:[],pagecount:1,format:'m3u'};
}
export function decodeCatalog(raw:string,format:SourceFormat='auto'):CatalogPayload{
 const value=raw.trim();if(format==='cms-xml'||format==='auto'&&value.startsWith('<'))return xmlPayload(value);
 if(format==='m3u'||format==='auto'&&value.replace(/^\uFEFF/,'').startsWith('#EXTM3U'))return m3uPayload(value);
 let body;try{body=JSON.parse(value);}catch{throw Error('未识别为 JSON、CMS XML 或 M3U，请检查接口类型');}
 if(!body||typeof body!=='object')throw Error('片库数据格式无效');
 if(format==='cms-json'||format==='auto'&&'list' in body){
  if(body.list===null)body.list=[];
  if(!Array.isArray(body.list))throw Error('接口缺少 list 数组');
  return {list:body.list.slice(0,500),class:Array.isArray(body.class)?body.class.filter((c:Record<string,unknown>)=>c&&typeof c.type_name==='string'&&/^\d+$/.test(String(c.type_id))).slice(0,150):[],pagecount:Math.min(10000,Math.max(1,Number(body.pagecount)||1)),format:'cms-json'};
 }
 const items=Array.isArray(body)?body:body.items;if(!Array.isArray(items))throw Error('自定义片库需要 items 数组');
 const list=items.slice(0,500).filter(v=>v&&typeof v==='object'&&v.title).map((v,i)=>({vod_id:String(v.id??i+1),vod_name:v.title,vod_year:v.year,type_name:v.category,vod_content:v.description,vod_pic:v.image,vod_time:v.updatedAt,vod_remarks:v.remarks,vod_play_url:(Array.isArray(v.episodes)?v.episodes:[{name:'正片',url:v.url}]).filter((e:Record<string,unknown>)=>e&&safeMedia(e.url)).map((e:Record<string,unknown>,j:number)=>`${plainText(e.name)||`第 ${j+1} 集`}$${safeMedia(e.url)}`).join('#')}));
 return {list,class:[],pagecount:1,format:'json-feed'};
}
