import {GET as catalog} from './api/catalog';
import {GET as discover} from './api/discover';
import {GET as media,HEAD as mediaHead} from './api/media';
import {authenticated,login,loginPage,logout} from './auth';
import {BUILTIN_SOURCES} from './lib/online';
export type Env={ASSETS:{fetch:(request:Request)=>Promise<Response>};PASSWORD?:string};
const publicAsset=(path:string)=>path.startsWith('/assets/')||path.startsWith('/posters/')||['/favicon.svg','/icon-192.png','/icon-512.png','/poster.svg','/manifest.webmanifest','/sw.js','/service-worker.js','/robots.txt'].includes(path);
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/health')return Response.json({app:'KEN TV',platform:'Cloudflare Pages',version:'6.0.0',sources:BUILTIN_SOURCES.length,passwordProtected:!!env.PASSWORD},{headers:{'Cache-Control':'no-store'}});
 if(path==='/__ken/login')return login(request,env);
 if(path==='/__ken/logout')return logout();
 if(!publicAsset(path)&&!await authenticated(request,env))return path.startsWith('/api/')?Response.json({error:'请先输入网站访问密码'},{status:401,headers:{'Cache-Control':'no-store'}}):loginPage();
 if(path.startsWith('/api/')){
  if(!['GET','HEAD'].includes(request.method))return Response.json({error:'请求方式不支持'},{status:405,headers:{Allow:'GET, HEAD'}});
  const handler=path==='/api/catalog'?catalog:path==='/api/discover'?discover:path==='/api/media'?(request.method==='HEAD'?mediaHead:media):null;
  if(!handler)return Response.json({error:'接口不存在'},{status:404});const response=await handler(request);
  if(request.method==='HEAD'){await response.body?.cancel();return new Response(null,{status:response.status,headers:response.headers});}return response;
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);if(path==='/'||path==='/index.html')headers.set('Cache-Control','no-cache');headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
