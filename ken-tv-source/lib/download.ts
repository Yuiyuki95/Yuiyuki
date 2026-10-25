export type DownloadProgress={stage:string;completed:number;total:number;bytes:number};
type Chunk={url:string;init?:boolean};
export type Playlist={variants:{url:string;bandwidth:number}[];chunks:Chunk[];extension:'ts'|'mp4'};
const attributes=(line:string)=>Object.fromEntries(Array.from(line.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g)).map(([,key,value])=>[key,value.replace(/^"|"$/g,'')]));
function resolveUrl(value:string,base:string){const url=new URL(value,base);if(url.protocol!=='https:'||url.username||url.password)throw Error('下载仅支持 HTTPS 视频地址');return url.href;}
export function parsePlaylist(text:string,base:string):Playlist{
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(s=>s.trim());if(lines[0]!=='#EXTM3U')throw Error('源站未返回有效的 M3U8');
 const variants:Playlist['variants']=[],chunks:Chunk[]=[];let pendingBandwidth:number|undefined,init='',extension:'ts'|'mp4'='ts';
 for(const line of lines){
  if(line.startsWith('#EXT-X-KEY:')&&attributes(line).METHOD!=='NONE')throw Error('此视频流有加密，当前无法合并下载；可以继续在线播放');
  if(line.startsWith('#EXT-X-BYTERANGE')||line.startsWith('#EXT-X-GAP'))throw Error('此分段格式暂不支持下载');
  if(line.startsWith('#EXT-X-MEDIA:')&&attributes(line).TYPE==='AUDIO'&&attributes(line).URI)throw Error('此视频使用独立音轨，暂不支持合并下载');
  if(line.startsWith('#EXT-X-STREAM-INF:'))pendingBandwidth=Number(attributes(line).BANDWIDTH)||0;
  else if(line.startsWith('#EXT-X-MAP:')){const a=attributes(line);if(a.BYTERANGE||!a.URI)throw Error('此初始化分段暂不支持下载');const u=resolveUrl(a.URI,base);if(init&&init!==u)throw Error('此视频切换了编码，暂不支持合并下载');if(!init){init=u;chunks.push({url:u,init:true});extension='mp4';}}
  else if(line&&!line.startsWith('#')){const url=resolveUrl(line,base);if(pendingBandwidth!==undefined){variants.push({url,bandwidth:pendingBandwidth});pendingBandwidth=undefined;}else chunks.push({url});}
 }
 if(!variants.length&&!lines.includes('#EXT-X-ENDLIST'))throw Error('这是直播或尚未结束的视频，暂不支持完整下载');
 if(chunks.length>3000)throw Error('视频分段过多，请选择其他来源');
 if(!variants.length&&!chunks.length)throw Error('没有找到可下载的视频分段');
 return {variants:variants.sort((a,b)=>b.bandwidth-a.bandwidth),chunks,extension};
}
const endpoint=(url:string,kind:string)=>`/api/media?kind=${kind}&url=${encodeURIComponent(url)}`;
async function media(url:string,kind:string,signal:AbortSignal){
 const response=await fetch(endpoint(url,kind),{signal});if(!response.ok){let error='源站下载失败';try{error=((await response.json()) as {error?:string}).error||error;}catch{}throw Error(error);}return response;
}
export async function collectHls(url:string,signal:AbortSignal,onProgress:(p:DownloadProgress)=>void,quality:'low'|'high'='low'){
 onProgress({stage:'正在读取视频分段…',completed:0,total:0,bytes:0});let playlist:Playlist|undefined;
 for(let depth=0;depth<4;depth++){const response=await media(url,'manifest',signal);playlist=parsePlaylist(await response.text(),response.headers.get('X-Media-URL')||url);if(!playlist.variants.length)break;url=playlist.variants[quality==='low'?playlist.variants.length-1:0].url;playlist=undefined;}
 if(!playlist||playlist.variants.length)throw Error('视频播放列表嵌套过多');
 const buffers:BlobPart[]=new Array(playlist.chunks.length),limit=350*1024*1024;let next=0,completed=0,bytes=0;
 const controller=new AbortController(),taskSignal=AbortSignal.any([signal,controller.signal]);
 try{await Promise.all(Array.from({length:3},async()=>{while(next<playlist!.chunks.length){const index=next++,chunk=playlist!.chunks[index];let result:ArrayBuffer|undefined;
  for(let attempt=0;attempt<2;attempt++){try{const response=await media(chunk.url,'segment',taskSignal);result=await response.arrayBuffer();if(!result.byteLength)throw Error('视频分段为空');break;}catch(e){if(taskSignal.aborted||attempt===1)throw e;}}
  const data=new Uint8Array(result!);if(chunk.init){if(data.length<12||new TextDecoder().decode(data.slice(4,8))!=='ftyp')throw Error('视频初始化数据不是 MP4');}else if(playlist!.extension==='ts'&&(data[0]!==0x47||data.length>188&&data[188]!==0x47))throw Error('分段不是标准 TS，请换一个来源下载');
  bytes+=data.byteLength;if(bytes>limit)throw Error('本页合并下载上限为 350 MB，请换低清晰度来源或使用视频直链下载');buffers[index]=result!;completed++;onProgress({stage:'正在下载分段…',completed,total:playlist!.chunks.length,bytes});
 }}));}catch(e){controller.abort();throw e;}
 onProgress({stage:'正在合并文件…',completed,total:playlist.chunks.length,bytes});return {blob:new Blob(buffers,{type:playlist.extension==='mp4'?'video/mp4':'video/mp2t'}),extension:playlist.extension};
}
export function downloadName(title:string,episode:string,extension:string){return `${title} - ${episode}`.replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,130)+'.'+extension;}
export function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function saveDirect(url:string,name:string,signal:AbortSignal){const href=endpoint(url,'file')+`&name=${encodeURIComponent(name)}`;const response=await fetch(href,{method:'HEAD',signal});if(!response.ok)throw Error('此来源暂时无法下载，请换一个片源');const link=document.createElement('a');link.href=href;link.download=name;document.body.appendChild(link);link.click();link.remove();}
