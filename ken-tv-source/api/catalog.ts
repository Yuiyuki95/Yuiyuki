import {validFormat} from '@/lib/catalog-formats';
import {fetchCatalog} from '@/lib/source-fetch';
export async function GET(request:Request){
 const url=new URL(request.url),target=url.searchParams.get('url')||'',q=url.searchParams.get('q')||'',id=url.searchParams.get('id')||'';
 const format=url.searchParams.get('format')||'auto';if(!validFormat(format))return Response.json({error:'接口类型无效'},{status:400});
 if(id&&!/^\d{1,20}$/.test(id))return Response.json({error:'影片编号无效'},{status:400});
 if(target.length>2048)return Response.json({error:'接口地址过长'},{status:400});
 try{return Response.json(await fetchCatalog(target,q,{id:id||undefined,format}),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'视频源暂时无法连接'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
