type Env={PASSWORD?:string};
const encoder=new TextEncoder(),cookieName='__Host-ken_session';
const cookie=(value:string,age:number)=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
async function key(password:string){return crypto.subtle.importKey('raw',encoder.encode('KEN-TV Pages session v1:'+password),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const hex=(buffer:ArrayBuffer)=>Array.from(new Uint8Array(buffer),v=>v.toString(16).padStart(2,'0')).join('');
export async function authenticated(request:Request,env:Env){
 if(!env.PASSWORD)return true;
 const value=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
 const [expires,nonce,signature]=value.split('.');if(!/^\d{10}$/.test(expires||'')||! /^[a-f0-9]{32}$/.test(nonce||'')||! /^[a-f0-9]{64}$/.test(signature||'')||Number(expires)<=Date.now()/1000)return false;
 return crypto.subtle.verify('HMAC',await key(env.PASSWORD),Uint8Array.from(signature.match(/../g)!,part=>parseInt(part,16)),encoder.encode(`${expires}.${nonce}`));
}
export function loginPage(error=false){return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KEN TV · 访问密码</title><style>html{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#faf6fc;color:#4c3658}body{margin:0;min-height:100dvh;display:grid;place-items:center}.card{background:white;border:1px solid #eadfed;border-radius:20px;box-shadow:0 15px 60px #92739b12;padding:38px;width:min(330px,calc(100vw - 100px))}h1{font-size:28px;margin:0 0 12px;color:#8d60a1}p{font-size:13px;line-height:1.8;color:#8c7895}label{display:block;font-size:13px;margin:25px 0 8px}input{box-sizing:border-box;width:100%;padding:13px;font:inherit;border:1px solid #d9c8e2;border-radius:9px}button{width:100%;padding:13px;border:0;border-radius:9px;background:#9671a9;color:white;font-size:14px;margin-top:18px;cursor:pointer}.error{color:#a55466}</style></head><body><main class="card"><h1>KEN TV</h1><p>欢迎回到你的私人放映室。</p>${error?'<p class="error" role="alert">密码不正确，请重试。</p>':''}<form action="/__ken/login" method="post"><label for="password">网站访问密码</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button type="submit">进入放映室</button></form><p>使用这个网站原来设置的访问密码。</p></main></body></html>`,{status:error?401:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});}
const failures=new Map<string,{count:number;until:number}>();
export async function login(request:Request,env:Env){
 if(request.method!=='POST')return loginPage();
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('请求来源无效',{status:403});
 if(!env.PASSWORD)return Response.redirect(new URL('/',request.url).href,303);
 const ip=request.headers.get('cf-connecting-ip')||'unknown',prior=failures.get(ip);
 if(prior&&prior.until>Date.now()&&prior.count>=10)return new Response('尝试次数过多，请稍后再试。',{status:429,headers:{'Retry-After':'300','Cache-Control':'no-store'}});
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')||Number(request.headers.get('content-length'))>4096)return new Response('请求无效',{status:400});
 const raw=await request.text();if(raw.length>4096)return new Response('请求过大',{status:413});const value=new URLSearchParams(raw).get('password')||'';
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(value)),crypto.subtle.digest('SHA-256',encoder.encode(env.PASSWORD))]);const aa=new Uint8Array(a),bb=new Uint8Array(b);let different=0;for(let i=0;i<aa.length;i++)different|=aa[i]^bb[i];
 if(different){if(failures.size>1000)failures.clear();failures.set(ip,{count:prior&&prior.until>Date.now()?prior.count+1:1,until:Date.now()+300000});return loginPage(true);}
 failures.delete(ip);const nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer),payload=`${Math.floor(Date.now()/1000)+2592000}.${nonce}`,signature=hex(await crypto.subtle.sign('HMAC',await key(env.PASSWORD),encoder.encode(payload)));
 return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':cookie(`${payload}.${signature}`,2592000),'Cache-Control':'no-store'}});
}
export function logout(){return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':cookie('',0),'Cache-Control':'no-store'}});}
