export type SourceFormat='auto'|'cms-json'|'cms-xml'|'json-feed'|'m3u';
export type Source={id:string;name:string;url:string;enabled:boolean;format?:SourceFormat};
export const SOURCE_FORMATS:Record<SourceFormat,string>={auto:'自动识别','cms-json':'苹果 CMS · JSON','cms-xml':'苹果 CMS · XML','json-feed':'自定义 JSON 片库',m3u:'M3U 播放列表'};
export type Movie={id:string;title:string;original:string;year:string;category:string;description:string;image:string;source:string;episodes:{name:string;url:string}[];demo?:boolean;updatedAt?:string;remarks?:string;sourceUrl?:string;sourceFormat?:SourceFormat;remoteId?:string};
export function safeMedia(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function parseEpisodes(value:unknown){
 for(const line of String(value||'').split('$$$')){
  const seen=new Set<string>();const episodes=line.split('#').map((entry,i)=>{const j=entry.indexOf('$');return {name:j<0?`第 ${i+1} 集`:entry.slice(0,j),url:safeMedia(j<0?entry:entry.slice(j+1))};}).filter(e=>{if(!e.url||!/\.(m3u8|mp4|webm|m4v|mov)(?:[?#]|$)/i.test(e.url)||seen.has(e.url))return false;seen.add(e.url);return true;});
  if(episodes.length)return episodes;
 }
 return [];
}
export function plainText(value:unknown){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,e=>({'&amp;':'&','&quot;':'\"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[e]||e)).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).trim();}
export function normalizeItems(body:{list?:Record<string,unknown>[]},source:Source):Movie[]{return (body.list||[]).slice(0,500).map(v=>({id:`${source.id}:${v.vod_id}`,title:plainText(v.vod_name)||'未命名',original:'',year:String(v.vod_year||''),category:plainText(v.type_name)||'影片',description:plainText(v.vod_content||v.vod_blurb).slice(0,1000),image:safeMedia(v.vod_pic),source:source.name,episodes:parseEpisodes(v.vod_play_url),sourceUrl:source.url,sourceFormat:source.format,remoteId:String(v.vod_id||''),updatedAt:String(v.vod_time||''),remarks:plainText(v.vod_remarks)}));}
const base='https://storage.googleapis.com/gtv-videos-bucket/sample/';
export const DEMOS:Movie[]=[
{id:'demo-sintel',title:'辛特尔',original:'SINTEL',year:'2010',category:'奇幻',image:'/posters/Sintel.jpg',description:'为了寻找受伤后失散的小龙，一位少女穿越荒野与雪山，踏上一段关于相遇、执念与成长的旅途。',source:'Blender',demo:true,episodes:[{name:'预告片',url:'https://media.w3.org/2010/05/sintel/trailer.mp4'}]},
{id:'demo-bunny',title:'大雄兔',original:'BIG BUCK BUNNY',year:'2008',category:'动画',image:'/posters/BigBuckBunny.jpg',description:'阳光明媚的森林里，一只温柔的大兔子遇到了三个爱捣乱的小家伙。Blender Foundation 开放动画短片。',source:'Blender',demo:true,episodes:[{name:'预告片',url:'https://media.w3.org/2010/05/bunny/trailer.mp4'}]},
{id:'demo-steel',title:'钢铁之泪',original:'TEARS OF STEEL',year:'2012',category:'科幻',image:'/posters/TearsOfSteel.jpg',description:'未来的阿姆斯特丹，一群科学家与战士尝试重现一段往事，寻找拯救世界的机会。真人与电脑特效结合的开放短片。',source:'Blender',demo:true,episodes:[{name:'完整短片',url:'https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov'}]},
{id:'demo-dream',title:'大象之梦',original:'ELEPHANTS DREAM',year:'2006',category:'动画',image:'/posters/ElephantsDream.jpg',description:'两名性格迥异的人在奇异的机械世界中探索，见证想象力与现实之间的边界。Blender 首部开放电影。',source:'Blender',demo:true,episodes:[{name:'完整短片',url:'https://download.blender.org/ED/elephantsdream-480-h264-st-aac.mov'}]}
];
