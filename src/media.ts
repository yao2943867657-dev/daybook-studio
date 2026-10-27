import type { Asset } from './model';
export interface LoadedMedia { asset: Asset; element: HTMLImageElement | HTMLVideoElement; url: string }
export async function prepare(asset: Asset): Promise<LoadedMedia> {
  const url=URL.createObjectURL(asset.blob);
  try {
    const element = asset.type==='image' ? new Image() : document.createElement('video');
    if(element instanceof HTMLVideoElement) { element.muted=true;element.playsInline=true;element.preload='auto'; }
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error(`读取“${asset.name}”超时，请换成 JPG、PNG 或兼容的 MP4`)),15000);
      const done=()=>{clearTimeout(timer);resolve();};
      if(element instanceof HTMLVideoElement) element.onloadeddata=done; else element.onload=done;
      element.onerror=()=>{clearTimeout(timer);reject(new Error(`无法读取“${asset.name}”，请转成 JPG、PNG 或 H.264 MP4 后重试`));};
      element.src=url;
    });
    if(element instanceof HTMLVideoElement) asset.duration=element.duration;
    return {asset,element,url};
  } catch(e) { URL.revokeObjectURL(url);throw e; }
}
export function release(media: LoadedMedia[]) {
  for(const m of media) { if(m.element instanceof HTMLVideoElement){m.element.pause();m.element.removeAttribute('src');m.element.load();} URL.revokeObjectURL(m.url); }
}
export async function seek(m: LoadedMedia | undefined, time: number) {
  if(!m || !(m.element instanceof HTMLVideoElement)) return;
  const v=m.element, target=Math.min(time,Math.max(0,v.duration-.05));
  if(Math.abs(v.currentTime-target)<.015 && v.readyState>=2) return;
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{v.removeEventListener('seeked',done);reject(new Error('视频读取超时，请缩短片段或换用兼容视频'));},10000);
    const done=()=>{clearTimeout(timer);v.removeEventListener('seeked',done);resolve();};
    v.addEventListener('seeked',done);v.currentTime=target;
  });
}
export function sampleAssets(): Asset[] {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900" viewBox="0 0 1000 900"><rect width="1000" height="900" fill="#dce6d6"/><path d="M0 480Q280 330 520 450T1000 370V900H0" fill="#99ad82"/><path d="M0 650Q450 500 1000 650V900H0" fill="#839c70"/><circle cx="780" cy="170" r="94" fill="#fff3be"/><path d="M138 0Q95 280 185 580" stroke="#70694b" stroke-width="38" fill="none"/><g fill="#708b65"><ellipse cx="100" cy="105" rx="175" ry="110"/><ellipse cx="260" cy="205" rx="190" ry="115"/><ellipse cx="50" cy="320" rx="170" ry="120"/></g><path d="M240 590L700 550 850 780 290 850Z" fill="#f4eddb"/><g stroke="#c5b69a" stroke-width="3" opacity=".6"><path d="M310 583L365 838M400 575L465 822M490 568L570 807M580 560L670 792M265 650L758 638M278 735L810 715"/></g><ellipse cx="552" cy="690" rx="104" ry="51" fill="#d6b495"/><path d="M460 680q80-92 180 0q-22 50-90 45t-90-45" fill="#bb824c"/><g stroke="#f3dbb3" stroke-width="8"><path d="M490 660l14 30m20-45l15 35m20-40l15 34m20-29l14 28"/></g><path d="M360 620l-20-160m18 160l50-135m-55 135l-40-105" stroke="#5b7a55" stroke-width="8"/><g fill="#ead5ac"><circle cx="335" cy="465" r="30"/><circle cx="407" cy="483" r="25"/><circle cx="310" cy="512" r="26"/></g><g fill="#b79053"><circle cx="335" cy="465" r="10"/><circle cx="407" cy="483" r="8"/><circle cx="310" cy="512" r="8"/></g><path d="M307 594h95l-16 103h-65Z" fill="#eee9d9"/><g fill="#fff6dc" opacity=".5"><circle cx="560" cy="115" r="10"/><circle cx="632" cy="280" r="8"/><circle cx="870" cy="430" r="13"/></g></svg>`;
  return [{id:'sample-picnic',name:'示例 · 公园里的小野餐（原创插画）',type:'image',blob:new Blob([svg],{type:'image/svg+xml'})}];
}
