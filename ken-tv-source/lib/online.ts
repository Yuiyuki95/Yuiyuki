import type {Movie,Source} from './catalog';
export const BUILTIN_SOURCES:Source[]=[
 {id:'libretv-ruyi',name:'如意资源',url:'https://cj.rycjapi.com/api.php/provide/vod',enabled:true},
 {id:'libretv-wujin',name:'无尽资源',url:'https://api.wujinapi.me/api.php/provide/vod',enabled:true},
 {id:'ken-360',name:'360资源',url:'https://360zy.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-jisu',name:'极速资源',url:'https://jszyapi.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-hongniu',name:'红牛资源',url:'https://www.hongniuzy2.com/api.php/provide/vod/',enabled:true,format:'cms-json'}
, {id:'ken-baofeng',name:'暴风资源',url:'https://bfzyapi.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-liangzi',name:'量子资源',url:'https://cj.lziapi.com/api.php/provide/vod/',enabled:true,format:'cms-json'}
, {id:'ken-modu',name:'魔都资源',url:'https://www.mdzyapi.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-zuida',name:'最大资源',url:'https://api.zuidapi.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-baidu',name:'百度云资源',url:'https://api.apibdzy.com/api.php/provide/vod',enabled:true,format:'cms-json'}
, {id:'ken-huya',name:'虎牙资源',url:'https://www.huyaapi.com/api.php/provide/vod/',enabled:true,format:'cms-json'}
, {id:'ken-feifan',name:'非凡影视',url:'https://ffzy5.tv/api.php/provide/vod',enabled:true,format:'cms-json'}
];
export const UPDATE_TIMEZONE='Asia/Kuala_Lumpur';
export function sourceTime(value:unknown):number{
 if(typeof value==='number'||typeof value==='string'&&/^\d{10,13}$/.test(value)){const n=Number(value);return n<1e12?n*1000:n;}
 const str=String(value||'').trim();if(!str)return 0;
 const clean=str.replace(' ','T');const time=Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(clean)?clean:clean+'+08:00');return Number.isFinite(time)?time:0;
}
export function localDay(time=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:UPDATE_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(time);}
export function isAnime(movie:Pick<Movie,'category'>){return /动漫|动画|番剧|漫剧|anime|animation|cartoon/i.test(movie.category);}
export function isTodayAnime(movie:Movie,now=Date.now()){const time=sourceTime(movie.updatedAt);return isAnime(movie)&&time>0&&time<=now+300000&&localDay(time)===localDay(now);}
export function movieKey(movie:Movie){return movie.title.trim().normalize('NFKC').replace(/\s+/g,'').toLowerCase()+'|'+movie.year;}
export function mergeMovies(movies:Movie[]){const seen=new Set<string>();return movies.filter(m=>{const key=movieKey(m);if(seen.has(key))return false;seen.add(key);return true;});}
export function updateClock(value?:string){const t=sourceTime(value);return t?new Intl.DateTimeFormat('zh-CN',{timeZone:UPDATE_TIMEZONE,hour:'2-digit',minute:'2-digit',hour12:false}).format(t):'';}
export type OnlineFeed={items:Movie[];today:Movie[];checkedAt:string;date:string;timezone:string;sources:{id:string;name:string;ok:boolean;count:number;error?:string}[]};
