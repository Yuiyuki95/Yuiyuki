"use client";
import {useEffect,useRef,useState} from 'react';
import {Download,X,LoaderCircle,CheckCircle2} from 'lucide-react';
import {collectHls,downloadName,saveBlob,saveDirect,type DownloadProgress} from '@/lib/download';
export default function DownloadControl({title,episode}:{title:string;episode?:{name:string;url:string}}){
 const controller=useRef<AbortController|null>(null);const [progress,setProgress]=useState<DownloadProgress|null>(null),[message,setMessage]=useState(''),[taskName,setTaskName]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false),[quality,setQuality]=useState<'low'|'high'>('low');
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function start(){if(!episode||busy)return;const task=new AbortController();controller.current=task;setBusy(true);setSuccess(false);setMessage('');setTaskName(`${title} · ${episode.name}`);
  try{if(/\.m3u8(?:[?#]|$)/i.test(episode.url)){const result=await collectHls(episode.url,task.signal,setProgress,quality);if(task.signal.aborted)return;saveBlob(result.blob,downloadName(title,episode.name,result.extension));setMessage('文件已交给浏览器保存，请在下载列表中查看。');}
   else{setProgress({stage:'正在连接下载地址…',completed:0,total:0,bytes:0});const ext=episode.url.match(/\.(mp4|webm|mov|m4v|ts)(?:[?#]|$)/i)?.[1]||'mp4';await saveDirect(episode.url,downloadName(title,episode.name,ext),task.signal);setMessage('已交给浏览器下载，可在浏览器下载列表查看进度。');}
   setSuccess(true);
  }catch(e){setMessage(task.signal.aborted?'下载已取消。':e instanceof Error?e.message:'下载失败，请重试或换源');}finally{setBusy(false);setProgress(null);controller.current=null;}
 }
 const percent=progress?.total?Math.floor(progress.completed/progress.total*100):0;
 return <div className="download-control"><button disabled={!episode||busy} className="secondary download-current" onClick={()=>void start()}>{busy?<LoaderCircle size={16} className="spin"/>:<Download size={16}/>}下载当前集</button>{episode&&/\.m3u8(?:[?#]|$)/i.test(episode.url)&&<select aria-label="下载清晰度" disabled={busy} value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')}><option value="low">省流清晰度</option><option value="high">最高清晰度</option></select>}<span className="download-note">直链文件 / M3U8 分段</span>{(busy||message)&&<div className="download-task" role="status"><div className="download-task-heading"><b>{taskName}</b>{busy?<button aria-label="取消下载" onClick={()=>controller.current?.abort()}><X size={16}/>取消</button>:<button aria-label="关闭下载提示" onClick={()=>setMessage('')}><X size={16}/></button>}</div>{busy&&progress?<><p>{progress.stage} {progress.total?`${percent}% · ${progress.completed}/${progress.total}`:''} {progress.bytes?`· ${(progress.bytes/1048576).toFixed(1)} MB`:''}</p><progress value={progress.total?percent:undefined} max={100}/><small>M3U8 合并期间请保持本页打开；关闭播放页会取消下载。合并上限 350 MB。</small></>:<p className={success?'download-success':'download-error'}>{success&&<CheckCircle2 size={15}/>} {message}</p>}</div>}</div>;
}
