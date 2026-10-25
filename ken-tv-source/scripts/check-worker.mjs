import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const {default:worker}=await import('../../_worker.js?check='+Date.now());
const origin='https://ken-test.example.org';
const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname==='/'?readFileSync(new URL('../../index.html',import.meta.url)):'asset',{headers:{'Content-Type':'text/html'}})}};
const request=(path,options)=>new Request(origin+path,options);
const health=await worker.fetch(request('/api/health'),env);assert.equal((await health.json()).sources,12);
const home=await worker.fetch(request('/'),env);assert.equal(home.status,200);const html=await home.text();assert.match(html,/KEN TV/);assert.match(html,/assets\/index-/);assert.ok(!html.includes('chatgpt.site'));
const secure={...env,PASSWORD:'local-test-password'};
const denied=await worker.fetch(request('/api/catalog'),secure);assert.equal(denied.status,401);
const loginPage=await worker.fetch(request('/'),secure);assert.match(await loginPage.text(),/访问密码/);
const form={method:'POST',headers:{origin,'Content-Type':'application/x-www-form-urlencoded'},body:'password=local-test-password'};
const login=await worker.fetch(request('/__ken/login',form),secure);assert.equal(login.status,303);const setCookie=login.headers.get('Set-Cookie');assert.match(setCookie,/HttpOnly; Secure; SameSite=Lax/);assert.ok(!setCookie.includes('local-test-password'));const cookie=setCookie.split(';')[0];
assert.equal((await worker.fetch(request('/',{headers:{cookie}}),secure)).status,200);
assert.equal((await worker.fetch(request('/api/catalog',{headers:{cookie:cookie.slice(0,-1)+'z'}}),secure)).status,401);
assert.match(await (await worker.fetch(request('/',{headers:{cookie}}),{...secure,PASSWORD:'new-test-password'})).text(),/网站访问密码/);
assert.equal((await worker.fetch(request('/__ken/login',{...form,headers:{...form.headers,origin:'https://other.example.org'}}),secure)).status,403);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input)=>{
 const url=new URL(String(input));if(url.hostname==='cloudflare-dns.com')return Response.json({Answer:[{type:1,data:'8.8.8.8'}]});
 if(url.hostname==='media.example.org')return new Response(new Uint8Array([0x47,1,2]),{headers:{'Content-Type':'video/mp2t'}});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return Response.json({list:[{vod_id:1,vod_name:'今天的动画',type_name:'日韩动漫',vod_time:today+' 00:00:00',vod_play_url:'第1集$https://media.example.org/1.m3u8'},{vod_id:2,vod_name:'电影',type_name:'动作片',vod_time:today+' 00:00:00',vod_play_url:'正片$https://media.example.org/2.mp4'}],class:[{type_id:30,type_name:'日韩动漫',type_pid:4}],pagecount:1});
};
try{
 const search=await worker.fetch(request('/api/catalog?url=https%3A%2F%2Fapi.example.org%2Fvod&q=动画'),env);assert.equal(search.status,200);assert.equal((await search.json()).list.length,2);
 const feed=await worker.fetch(request('/api/discover'),env);assert.equal(feed.status,200);const body=await feed.json();assert.equal(body.sources.length,3);assert.ok(body.today.length);assert.ok(body.today.every(movie=>movie.category.includes('动漫')));
 const media=await worker.fetch(request('/api/media?kind=segment&url=https%3A%2F%2Fmedia.example.org%2F1.ts'),env);assert.deepEqual([...new Uint8Array(await media.arrayBuffer())],[0x47,1,2]);
 assert.equal((await worker.fetch(request('/api/catalog?url=https%3A%2F%2F127.0.0.1%2Fsecret'),env)).status,400);
}finally{globalThis.fetch=originalFetch;}
const build=JSON.parse(readFileSync(new URL('../../ken-tv-build.json',import.meta.url),'utf8'));for(const file of build.files)assert.ok(existsSync(new URL('../../'+file,import.meta.url)),file);
console.log('PASS: Pages assets, 12 sources, API routing, daily anime, media bytes, preserved password, signed cookie and unsafe input rejection');
