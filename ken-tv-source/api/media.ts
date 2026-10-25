import {fetchPublic} from '@/lib/source-fetch';
export async function GET(request:Request){
 const input=new URL(request.url),value=input.searchParams.get('url')||'',kind=input.searchParams.get('kind')||'file';
 if(value.length>4096||!['file','manifest','segment'].includes(kind))return Response.json({error:'下载参数无效'},{status:400});
 try{
  if(kind==='file'&&!/\.(mp4|webm|mov|m4v|ts)(?:[?#]|$)/i.test(value))throw Error('普通下载需要 MP4、WebM、MOV 或 TS 视频直链');
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(kind==='file'?600000:45000)]);
  const {response,url}=await fetchPublic(value,signal);const type=response.headers.get('content-type')||'application/octet-stream';
  if(/text\/html|application\/(?:json|xml|xhtml)/i.test(type))throw Error('源站返回网页，无法下载视频');
  const max=kind==='manifest'?2000000:kind==='segment'?32000000:2000000000;
  if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw Error('视频超过本次下载大小限制');}
  const reader=response.body?.getReader();if(!reader)throw Error('视频内容为空');let size=0;
  const stream=new ReadableStream({async pull(controller){try{const chunk=await reader.read();if(chunk.done){controller.close();return;}size+=chunk.value.byteLength;if(size>max)throw Error('视频超过本次下载大小限制');controller.enqueue(chunk.value);}catch(e){await reader.cancel();controller.error(e);}},cancel(reason){return reader.cancel(reason);}});
  const headers=new Headers({'Content-Type':kind==='file'?'application/octet-stream':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Media-URL':url});
  if(kind==='file'){const name=(input.searchParams.get('name')||'KEN-TV-video').replace(/[\r\n<>:"/\\|?*]/g,'_').slice(0,150);headers.set('Content-Disposition',`attachment; filename="KEN-TV-video"; filename*=UTF-8''${encodeURIComponent(name)}`);}
  return new Response(stream,{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'下载连接失败'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
export async function HEAD(request:Request){const response=await GET(request);await response.body?.cancel();return new Response(null,{status:response.status,headers:response.headers});}
