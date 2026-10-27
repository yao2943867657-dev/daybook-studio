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
  const flowers=`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900"><rect width="700" height="900" fill="#e6d9cb"/><rect x="62" y="60" width="576" height="620" rx="200" fill="#b9ccd0"/><path d="M65 360h572M350 64v609" stroke="#f3eadb" stroke-width="22"/><rect y="682" width="700" height="218" fill="#b79474"/><ellipse cx="360" cy="790" rx="184" ry="28" fill="#997b6066"/><g fill="none" stroke="#77956b" stroke-width="10"><path d="m350 710-67-340m76 340 65-390m-70 390 13-440m-5 440-115-230"/></g><g fill="#f3d5c3"><ellipse cx="275" cy="361" rx="47" ry="51"/><ellipse cx="424" cy="312" rx="46" ry="49"/></g><g fill="#ecdba0"><ellipse cx="370" cy="266" rx="49" ry="51"/><ellipse cx="243" cy="483" rx="39" ry="42"/></g><g fill="#9cb38a"><ellipse cx="320" cy="516" rx="22" ry="63" transform="rotate(-30 320 516)"/><ellipse cx="404" cy="519" rx="23" ry="62" transform="rotate(28 404 519)"/></g><path d="M275 615q90 23 164 0l-18 152q-57 28-126 0Z" fill="#f9edce"/><path d="M303 628v126m31-122v129m34-127v129m33-134v123" stroke="#e6d6b2" stroke-width="5"/><circle cx="530" cy="158" r="53" fill="#fff0c8" opacity=".8"/></svg>`;
  const seaside=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700"><rect width="900" height="700" fill="#d1e1df"/><circle cx="678" cy="156" r="70" fill="#f5e5b8"/><path d="M0 320q180-25 380 5t520-18v393H0Z" fill="#9bbabb"/><path d="M0 462q230-38 470 5t430-17M0 525q290-20 900 2" fill="none" stroke="#e9eee0" stroke-width="12"/><path d="M0 605q280-95 527-27t373-31v153H0Z" fill="#e7d2ae"/><path d="M183 615V197m0 0 163 227H192" fill="#f6eddb" stroke="#998870" stroke-width="7"/><path d="m184 259-101 165h96" fill="#d6a692"/><path d="m75 451 311-2-60 56H124Z" fill="#8b8272"/><path d="M282 153q17-23 35 0 17-23 34 0m-270 16q17-23 35 0 17-23 34 0" fill="none" stroke="#7b938d" stroke-width="5"/><g fill="#bfaa86"><ellipse cx="678" cy="627" rx="18" ry="8"/><ellipse cx="724" cy="653" rx="12" ry="6"/></g></svg>`;
  return [
    {id:'sample-picnic',name:'示例 · 公园小野餐（原创插画）',type:'image',blob:new Blob([svg],{type:'image/svg+xml'})},
    {id:'sample-flowers',name:'示例 · 窗边的小花（原创插画）',type:'image',blob:new Blob([flowers],{type:'image/svg+xml'})},
    {id:'sample-seaside',name:'示例 · 散步去海边（原创插画）',type:'image',blob:new Blob([seaside],{type:'image/svg+xml'})},
  ];
}
