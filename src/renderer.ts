import { measureInline,graphemes } from './inline-content';
import { paginate, themes, wrapText, stickerPosition, type Diary, type TextLine, type Theme, type ThemeId } from './model';
import { drawSticker, getMoodSticker } from './catalog';
import type { LoadedMedia } from './media';
import { notebookAsset } from './book-assets';
export { prepareNotebookAssets } from './book-assets';

type Ctx=CanvasRenderingContext2D;
export interface MediaRect { x:number; y:number; w:number; h:number; rotation?:number }
export interface EditRegion extends MediaRect { kind:'title'|'body'|'note'|'mood' }
export type EditingField=EditRegion['kind'];
const hand='"KaiTi", "STKaiti", "Kaiti SC", "FangSong", serif';
const sans='"PingFang SC", "Microsoft YaHei", sans-serif';
export const dimensions=(d:Diary)=>d.ratio==='portrait'?[900,1600]:[1600,900];
interface Geometry { title:MediaRect; body:MediaRect&{size:number;step:number;lines:number}; note:MediaRect; mood:MediaRect; media:MediaRect }
// Paper bounds measured on the original material plates at the 1600 × 900 canvas.
// These exclude bindings, layered deckle edges and outer collage decorations.
const rightPaper:Record<ThemeId,MediaRect>={
  sketch:{x:810,y:60,w:685,h:760},cream:{x:810,y:80,w:670,h:700},
  travel:{x:815,y:80,w:540,h:730},blue:{x:805,y:65,w:620,h:755},
  forest:{x:855,y:100,w:595,h:680},film:{x:805,y:95,w:655,h:685},
  chat:{x:835,y:90,w:615,h:710},pocket:{x:840,y:110,w:670,h:670},
};
export function paperBounds(d:Diary):MediaRect{
  if(d.ratio==='landscape')return {...rightPaper[d.theme]};
  const margins:Record<ThemeId,[number,number]>={sketch:[150,850],cream:[165,860],travel:[260,850],blue:[220,850],forest:[270,835],film:[205,850],chat:[180,835],pocket:[115,850]};
  const [left,right]=margins[d.theme];return {x:left,y:90,w:right-left,h:1390};
}
function geometry(d:Diary):Geometry{
  const g=baseGeometry(d),paper=paperBounds(d);
  if(d.ratio==='portrait'){
    const x=paper.x+20,w=paper.w-40;
    for(const field of ['title','body','note','mood','media'] as const)Object.assign(g[field],{x,w});
    return g;
  }
  const frame=d.theme==='cream'?17:d.theme==='film'?23:10;
  const top=d.theme==='film'?25:21,bottom=d.theme==='cream'?42:d.theme==='film'?25:10;
  g.media.w=Math.min(g.media.w,paper.w-120-2*frame);
  g.media.x=paper.x+(paper.w-g.media.w)/2;
  // Center the complete photo + mood group vertically, including the white frame.
  const gap=24,groupHeight=top+g.media.h+bottom+gap+g.mood.h;
  g.media.y=paper.y+(paper.h-groupHeight)/2+top;
  g.mood={x:g.media.x,y:g.media.y+g.media.h+bottom+gap,w:g.media.w,h:g.mood.h};
  return g;
}
function baseGeometry(d:Diary):Geometry {
  if(d.ratio==='portrait') {
    const media={x:146,y:270,w:634,h:420};
    if(d.theme==='film')Object.assign(media,{x:95,y:290,w:710,h:360});
    if(d.theme==='forest')Object.assign(media,{x:142,y:247,w:616,h:438});
    const left=d.theme==='forest'?228:d.theme==='blue'?195:145;
    return {title:{x:left,y:105,w:780-left,h:125},body:{x:left,y:808,w:780-left,h:416,size:34,step:52,lines:8},note:{x:left,y:1310,w:780-left,h:126},mood:{x:left,y:735,w:780-left,h:55},media:{...media,x:left,w:780-left}};
  }
  const common:Geometry={title:{x:169,y:127,w:539,h:118},body:{x:185,y:292,w:518,h:311,size:32,step:44,lines:7},note:{x:183,y:669,w:505,h:100},mood:{x:932,y:698,w:482,h:64},media:{x:920,y:176,w:514,h:485}};
  switch(d.theme){
    case 'cream':return {...common,title:{x:183,y:145,w:520,h:108},body:{x:187,y:305,w:515,h:304,size:32,step:43,lines:7},mood:{x:958,y:690,w:465,h:64},media:{x:951,y:184,w:484,h:444}};
    case 'travel':return {...common,title:{x:247,y:137,w:460,h:117},body:{x:247,y:309,w:455,h:304,size:31,step:43,lines:7},note:{x:247,y:679,w:455,h:97},media:{x:903,y:184,w:435,h:474}};
    case 'blue':return {...common,title:{x:230,y:143,w:480,h:115},body:{x:229,y:308,w:475,h:309,size:31,step:44,lines:7},note:{x:230,y:677,w:470,h:98},media:{x:930,y:174,w:483,h:486}};
    case 'forest':return {...common,title:{x:251,y:139,w:453,h:114},body:{x:255,y:308,w:448,h:309,size:31,step:44,lines:7},note:{x:253,y:677,w:450,h:97},media:{x:912,y:190,w:490,h:470}};
    case 'film':return {...common,title:{x:162,y:137,w:548,h:111},body:{x:180,y:302,w:524,h:306,size:31,step:43,lines:7},mood:{x:933,y:650,w:482,h:64},media:{x:903,y:235,w:542,h:350}};
    case 'chat':return {...common,title:{x:182,y:133,w:523,h:109},body:{x:182,y:299,w:520,h:309,size:32,step:44,lines:7},media:{x:928,y:162,w:507,h:498}};
    case 'pocket':return {...common,title:{x:169,y:128,w:538,h:113},body:{x:182,y:307,w:518,h:304,size:32,step:43,lines:7},media:{x:925,y:188,w:506,h:472}};
    default:return common;
  }
}
export function writingStyle(d:Diary){const g=geometry(d),t=themes.find(t=>t.id===d.theme)??themes[0];return {fontFamily:hand,bodyFontSize:g.body.size,bodyLineHeight:g.body.step,ink:t.ink};}
export function editRegions(d:Diary):EditRegion[]{const g=geometry(d);return (['title','body','note','mood'] as const).map(kind=>({kind,...g[kind]}));}
export function mediaRects(d:Diary):MediaRect[]{
  const b=geometry(d).media,gap=d.ratio==='portrait'?22:25,layout=d.layout??'single';
  if(layout==='duo')return [{x:b.x,y:b.y,w:b.w*.56-gap/2,h:b.h},{x:b.x+b.w*.56+gap/2,y:b.y+16,w:b.w*.44-gap/2,h:b.h-32}];
  if(layout==='trio'){
    if(d.theme==='film')return Array.from({length:3},(_,i)=>({x:b.x+i*(b.w+gap)/3,y:b.y+(i%2?15:0),w:(b.w-2*gap)/3,h:b.h-(i%2?30:0)}));
    if(d.theme==='blue')return [{x:b.x,y:b.y+15,w:b.w*.55-gap/2,h:b.h-30},{x:b.x+b.w*.55+gap/2,y:b.y,w:b.w*.45-gap/2,h:(b.h-gap)/2},{x:b.x+b.w*.55+gap/2,y:b.y+(b.h+gap)/2,w:b.w*.45-gap/2,h:(b.h-gap)/2}];
    if(d.theme==='travel')return [{x:b.x,y:b.y,w:(b.w-gap)/2,h:b.h*.48-gap/2},{x:b.x+(b.w+gap)/2,y:b.y+10,w:(b.w-gap)/2,h:b.h*.48-gap/2-10},{x:b.x,y:b.y+b.h*.48+gap/2,w:b.w,h:b.h*.52-gap/2}];
    return [{x:b.x,y:b.y,w:b.w,h:b.h*.57-gap/2},{x:b.x,y:b.y+b.h*.57+gap/2,w:(b.w-gap)/2,h:b.h*.43-gap/2},{x:b.x+(b.w+gap)/2,y:b.y+b.h*.57+gap/2,w:(b.w-gap)/2,h:b.h*.43-gap/2}];
  }
  if(layout==='wall')return Array.from({length:4},(_,i)=>({x:b.x+(i%2)*(b.w+gap)/2,y:b.y+Math.floor(i/2)*(b.h+gap)/2,w:(b.w-gap)/2,h:(b.h-gap)/2}));
  return [b];
}
export const mediaRect=(d:Diary)=>mediaRects(d)[0];
export function mediaForSlot(d:Diary,page:number,slot:number,media:LoadedMedia[]){
  const usable=media.filter(m=>m.asset.role!=='sticker');
  const explicit=d.pageSlots?.[String(page)]?.[slot]??(slot===0?d.pageMedia[String(page)]:undefined);
  if(explicit)return usable.find(m=>m.asset.id===explicit);
  return usable[page*mediaRects(d).length+slot];
}
export const activeMedia=(d:Diary,page:number,media:LoadedMedia[])=>mediaForSlot(d,page,0,media);
export function pagesFor(d:Diary,minimumPages=1):TextLine[][]{
  const ctx=document.createElement('canvas').getContext('2d')!,g=geometry(d);ctx.font=`${g.body.size}px ${hand}`;
  const pages=paginate(d.body,g.body.w,g.body.lines,s=>measureInline(s,d.inlineStickers,g.body.size,t=>ctx.measureText(t).width));
  if(pages.length>=minimumPages)return pages;
  const all=pages.flat(),perPage=Math.max(1,Math.ceil(all.length/minimumPages));
  return Array.from({length:minimumPages},(_,i)=>all.slice(i*perPage,(i+1)*perPage));
}
function box(c:Ctx,x:number,y:number,w:number,h:number,color:string|CanvasGradient,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function txt(c:Ctx,s:string,x:number,y:number,size:number,color:string,font=hand){c.font=`${size}px ${font}`;c.fillStyle=color;c.fillText(s,x,y);}
function line(c:Ctx,x:number,y:number,xx:number,yy:number,color:string,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function border(c:Ctx,x:number,y:number,w:number,h:number,color:string,width=1.8){c.save();c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x+9,y+2);c.bezierCurveTo(x+w*.4,y-3,x+w*.7,y+3,x+w-8,y);c.quadraticCurveTo(x+w+2,y,x+w,y+12);c.lineTo(x+w-2,y+h-9);c.quadraticCurveTo(x+w,y+h+2,x+w-10,y+h);c.lineTo(x+8,y+h-2);c.quadraticCurveTo(x-3,y+h,x,y+h-12);c.lineTo(x+2,y+11);c.stroke();c.restore();}
function shadow(c:Ctx,fn:()=>void,blur=9){c.save();c.shadowColor='#514b3224';c.shadowBlur=blur;c.shadowOffsetY=3;fn();c.restore();}
function torn(c:Ctx,x:number,y:number,w:number,h:number,color:string,angle=0){c.save();c.translate(x+w/2,y+h/2);c.rotate(angle);c.translate(-w/2,-h/2);shadow(c,()=>{c.fillStyle=color;c.beginPath();c.moveTo(0,5);for(let xx=0;xx<w;xx+=13)c.lineTo(xx,3+Math.sin(xx*1.5)*3);c.lineTo(w,3);for(let yy=0;yy<h;yy+=15)c.lineTo(w-3+Math.sin(yy)*3,yy);for(let xx=w;xx>0;xx-=13)c.lineTo(xx,h-4+Math.cos(xx)*3);for(let yy=h;yy>0;yy-=15)c.lineTo(3+Math.cos(yy)*3,yy);c.closePath();c.fill();});c.restore();}
function washi(c:Ctx,x:number,y:number,w:number,h:number,color:string,angle=-.12,pattern:'stripe'|'gingham'|'dot'='stripe'){
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=.78;box(c,0,0,w,h,color);c.beginPath();c.rect(0,0,w,h);c.clip();c.globalAlpha=.48;
  if(pattern==='gingham'){for(let xx=0;xx<w;xx+=20)box(c,xx,0,10,h,'#ffffff');for(let yy=0;yy<h;yy+=20)box(c,0,yy,w,10,'#ffffff');}
  if(pattern==='stripe')for(let xx=-h;xx<w;xx+=18)line(c,xx,0,xx+h,h,'#fffdf5',7);
  if(pattern==='dot')for(let yy=9;yy<h;yy+=17)for(let xx=9;xx<w;xx+=19){c.fillStyle='#fffdf4';c.beginPath();c.arc(xx,yy,3.3,0,Math.PI*2);c.fill();}
  c.restore();
}
function stem(c:Ctx,x:number,y:number,scale=1,color='#6c8061',flowers=false){
  c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(8,-45,-10,-95,11,-160);c.stroke();
  for(let i=1;i<6;i++){const yy=-i*23,side=i%2?1:-1;c.fillStyle=i%2?'#879572':'#a2a785';c.beginPath();c.ellipse(side*12,yy-10,7,20,side*.8,0,Math.PI*2);c.fill();line(c,side*3,yy+3,side*21,yy-28,'#65755d65',.7);}
  if(flowers){for(const [xx,yy]of [[11,-160],[-13,-137],[31,-133]]){line(c,0,-80,xx,yy,color,1.3);for(let i=0;i<5;i++){c.fillStyle='#d1bc80';c.beginPath();c.ellipse(xx+Math.sin(i*1.256)*5,yy+Math.cos(i*1.256)*5,3.3,5,i,0,Math.PI*2);c.fill();}box(c,xx-2,yy-2,4,4,'#8c7652');}}
  c.restore();
}
function clip(c:Ctx,x:number,y:number,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle='#9d8a5c';c.lineWidth=5;c.lineJoin='round';c.beginPath();c.moveTo(13,6);c.lineTo(0,30);c.lineTo(10,46);c.lineTo(5,67);c.lineTo(22,80);c.lineTo(35,56);c.lineTo(32,36);c.lineTo(43,15);c.quadraticCurveTo(35,-6,23,4);c.lineTo(13,20);c.stroke();c.strokeStyle='#f4e6bc';c.lineWidth=1.4;c.stroke();c.restore();}
function star(c:Ctx,x:number,y:number,size:number,color:string){c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const r=i%2?size*.42:size;c.lineTo(Math.sin(i*Math.PI/5)*r,-Math.cos(i*Math.PI/5)*r);}c.closePath();c.fill();c.restore();}
function cat(c:Ctx,x:number,y:number,size:number,color='#d8b79c'){
  c.save();c.translate(x,y);c.scale(size/100,size/100);c.strokeStyle='#665844';c.lineWidth=2.8;c.fillStyle=color;c.beginPath();c.moveTo(-35,-9);c.lineTo(-39,-47);c.lineTo(-12,-28);c.quadraticCurveTo(0,-34,13,-27);c.lineTo(39,-47);c.lineTo(36,-8);c.bezierCurveTo(63,41,-60,43,-35,-9);c.fill();c.stroke();
  for(const xx of [-15,15]){c.beginPath();c.arc(xx,-1,2.5,0,Math.PI*2);c.fillStyle='#514c3a';c.fill();}c.beginPath();c.moveTo(-3,9);c.lineTo(0,12);c.lineTo(3,9);c.moveTo(0,12);c.quadraticCurveTo(-5,21,-10,14);c.moveTo(0,12);c.quadraticCurveTo(5,21,10,14);c.stroke();
  c.fillStyle='#d7907966';for(const xx of [-25,25]){c.beginPath();c.ellipse(xx,11,7,4,0,0,Math.PI*2);c.fill();}c.restore();
}
function ticket(c:Ctx,x:number,y:number,w:number,h:number,label:string,color='#ddbc8b'){
  shadow(c,()=>box(c,x,y,w,h,color,3));c.save();c.setLineDash([3,5]);line(c,x+w*.72,y+8,x+w*.72,y+h-8,'#876f545d');c.restore();border(c,x+7,y+7,w-14,h-14,'#8c705784',1);txt(c,label,x+19,h>75?y+29:y+h*.5+7,21,'#6a5945',hand);txt(c,'收 藏',x+w*.77,y+h*.5+6,16,'#8c7057',sans);
}
function postmark(c:Ctx,x:number,y:number,label:string,color='#a06c5e'){
  c.save();c.translate(x,y);c.rotate(-.13);c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();c.arc(0,0,40,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,34,0,Math.PI*2);c.stroke();c.textAlign='center';txt(c,label,0,5,17,color,sans);for(let i=0;i<3;i++){c.beginPath();c.moveTo(38,-17+i*14);c.bezierCurveTo(60,-25+i*14,70,-9+i*14,97,-17+i*14);c.stroke();}c.restore();
}
function paperTexture(c:Ctx,x:number,y:number,w:number,h:number,color:string,grid='none'){
  box(c,x,y,w,h,color,9);let seed=327;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  c.fillStyle='#665333';c.globalAlpha=.075;for(let i=0;i<4800;i++)c.fillRect(x+random()*w,y+random()*h,.5+random(),.5+random());c.globalAlpha=1;
  if(grid==='dots'){c.fillStyle='#7c765027';for(let yy=y+18;yy<y+h;yy+=23)for(let xx=x+20;xx<x+w;xx+=23)c.fillRect(xx,yy,1.15,1.15);}
  if(grid==='grid'){for(let xx=x+20;xx<x+w;xx+=22)line(c,xx,y,xx,y+h,'#8299ac20');for(let yy=y+20;yy<y+h;yy+=22)line(c,x,yy,x+w,yy,'#8299ac20');}
  if(grid==='rule')for(let yy=y+146;yy<y+h-20;yy+=42)line(c,x+28,yy,x+w-28,yy,'#9b927725');
}
function book(c:Ctx,d:Diary,t:Theme){
  const [W,H]=dimensions(d),portrait=d.ratio==='portrait',x=portrait?37:43,y=35,w=W-2*x,h=H-80;
  const plate=notebookAsset(d.theme);
  if(plate){
    if(!portrait)c.drawImage(plate,0,0,W,H);
    else {
      // A single physical page on phones. Corner material proportions stay fixed;
      // only the empty paper middle extends to suit a tall reading page.
      const sw=plate.naturalWidth*.5,sh=plate.naturalHeight,sx=0,cap=sh*.16,dh=205;
      c.drawImage(plate,sx,0,sw,cap,0,0,W,dh);
      c.drawImage(plate,sx,cap,sw,sh-2*cap,0,dh,W,H-2*dh);
      c.drawImage(plate,sx,sh-cap,sw,cap,0,H-dh,W,dh);
    }
    return;
  }
  const bg:Record<string,string>={sketch:'#9a8068',cream:'#e5d6c3',travel:'#876a50',blue:'#d6dedb',forest:'#b9bda3',film:'#777b78',chat:'#c9ccc4',pocket:'#bdb3a5'};
  box(c,0,0,W,H,bg[t.id]);c.globalAlpha=.08;for(let i=0;i<35;i++)line(c,0,i*H/35,W,i*H/35+Math.sin(i)*15,'#44382a',i%3?1:3);c.globalAlpha=1;
  c.save();c.shadowColor='#29241465';c.shadowBlur=25;c.shadowOffsetY=13;box(c,x-10,y-9,w+20,h+20,t.id==='blue'?'#edf3e4b5':t.cover,17);c.restore();
  if(t.id==='blue'){border(c,x-17,y-16,w+34,h+33,'#ffffffc0',3);border(c,x-21,y-20,w+42,h+41,'#95a9ab',1);}
  for(let i=4;i>0;i--)box(c,x-2,y+i*3,w+4,h+6,i%2?'#d9d1be':'#ebe6d6',10);
  paperTexture(c,x,y,w,h,t.paper,t.id==='blue'?'grid':t.id==='travel'?'rule':t.id==='film'?'none':'dots');
  if(!portrait){const grad=c.createLinearGradient(774,0,829,0);grad.addColorStop(0,'#51432200');grad.addColorStop(.4,'#5e4f3920');grad.addColorStop(.51,'#443d3044');grad.addColorStop(.62,'#fffdf8b5');grad.addColorStop(1,'#51432200');box(c,774,y,55,h,grad);
    if(t.id==='blue'||t.id==='film')for(let yy=90;yy<800;yy+=115){c.fillStyle='#645e4e';for(const xx of [779,815]){c.beginPath();c.arc(xx,yy,4,0,Math.PI*2);c.fill();}c.strokeStyle=t.id==='blue'?'#9ca9b1':'#7b786b';c.lineWidth=5;c.beginPath();c.ellipse(798,yy,29,11,-.07,0,Math.PI*2);c.stroke();c.strokeStyle='#f7f5ea';c.lineWidth=1.2;c.stroke();}
    else {line(c,800,46,800,827,'#a9a08d5c',.7);box(c,797,819,11,55,t.id==='travel'?'#a66d50':'#8c9c7f');}
  }else if(t.id==='pocket')for(let xx=110;xx<820;xx+=65){c.strokeStyle='#847760';c.lineWidth=4;c.beginPath();c.ellipse(xx,47,9,21,0,0,Math.PI*2);c.stroke();}
}
function materialDecorations(c:Ctx,d:Diary,t:Theme,g:Geometry){
  const portrait=d.ratio==='portrait';
  txt(c,d.date.replaceAll('-',' / '),g.title.x,g.title.y-22,17,t.accent,sans);
  if(!d.decoration)return;
  const titleBottom=g.title.y+g.title.h-6;
  if(d.theme==='sketch'){
    c.save();c.globalAlpha=.36;line(c,g.title.x+6,titleBottom,g.title.x+g.title.w*.88,titleBottom-8,'#d3b84d',13);c.restore();
    if(d.decoration===2)drawSticker(c,'book',g.note.x+g.note.w-8,g.note.y+g.note.h+26,62,-.1);
  }else if(d.theme==='blue'){
    c.save();c.globalAlpha=.27;line(c,g.title.x,titleBottom,g.title.x+g.title.w*.94,titleBottom-6,'#8aa9c0',11);c.restore();
    torn(c,g.note.x-13,g.note.y-17,g.note.w+24,g.note.h+23,'#f1d5c7d9',-.015);
  }else if(d.theme==='forest'){
    c.save();c.globalAlpha=.35;line(c,g.title.x,titleBottom,g.title.x+g.title.w*.91,titleBottom-5,'#a4b082',8);c.restore();
    torn(c,g.note.x-14,g.note.y-16,g.note.w+25,g.note.h+22,'#d6dbc6bb',-.017);
  }else if(d.theme==='cream'){
    torn(c,g.note.x-12,g.note.y-15,g.note.w+24,g.note.h+28,'#f7e6c8b5',.012);
    if(d.decoration===2)drawSticker(c,'croissant',portrait?748:715,g.note.y+g.note.h,67,.12);
  }else if(d.theme==='travel'){
    c.save();c.setLineDash([3,6]);line(c,g.title.x,titleBottom,g.title.x+g.title.w,titleBottom,'#9f8c6c80');c.restore();
    torn(c,g.note.x-12,g.note.y-17,g.note.w+24,g.note.h+26,'#e5d6b8bb',-.012);
  }else if(d.theme==='film'){
    const m=g.media;box(c,m.x-23,m.y-25,m.w+46,m.h+50,'#302f2c');
    for(const yy of [m.y-19,m.y+m.h+11])for(let xx=m.x-12;xx<m.x+m.w+10;xx+=27)box(c,xx,yy,14,9,'#eee8da',1);
    line(c,g.title.x,titleBottom,g.title.x+g.title.w,titleBottom,'#827a6d65',1.3);
  }else if(d.theme==='chat'){
    c.save();c.globalAlpha=.48;line(c,g.title.x,titleBottom,g.title.x+g.title.w*.88,titleBottom-6,'#bd9cc2',6);c.restore();
    if(d.decoration===2){line(c,g.note.x,g.note.y-17,g.note.x+g.note.w,g.note.y-17,'#bfb0c2',.8);}
  }else if(d.theme==='pocket'){
    c.save();c.globalAlpha=.35;line(c,g.title.x,titleBottom,g.title.x+g.title.w*.9,titleBottom-7,'#d69ba9',10);c.restore();
    torn(c,g.note.x-13,g.note.y-16,g.note.w+26,g.note.h+25,'#f0dce1bb',.014);
  }
}
function decorations(c:Ctx,d:Diary,t:Theme,g:Geometry){
  if(notebookAsset(d.theme)){materialDecorations(c,d,t,g);return;}
  if(!d.decoration){txt(c,d.date.replaceAll('-',' / '),g.title.x,d.ratio==='portrait'?86:79,17,t.accent,sans);return;}
  if(d.ratio==='portrait'){
    if(d.decoration){washi(c,68,83,150,57,t.id==='blue'?'#a3bcd2':'#d6bdb2',-.16,'gingham');stem(c,812,210,.75,'#7d8b71',true);clip(c,85,48,.7);}
    if(t.id==='blue'){torn(c,83,103,722,115,'#d4e0e6',-.013);torn(c,80,1280,737,178,'#f0d8c6',.012);}
    if(t.id==='travel'){torn(c,82,106,734,127,'#e1cbaa');ticket(c,92,1470,417,53,'今天，也是一段旅程');postmark(c,724,1443,'旅 记');}
    if(t.id==='forest'){stem(c,83,651,1.7);stem(c,812,710,1.2);border(c,96,1282,692,184,'#97a080');}
    if(t.id==='cream'){torn(c,82,107,735,121,'#f1dfb5');cat(c,763,1452,68,'#eed8b7');}
    if(t.id==='film'){box(c,84,264,733,420,'#3e4541',3);ticket(c,104,1472,438,49,'今日放映 · 生活片段','#d3c7ad');}
    if(t.id==='chat'){torn(c,82,108,735,125,'#e5dfd2');box(c,90,1288,718,160,'#e6eadf',14);}
    if(t.id==='pocket'){box(c,72,92,751,141,'#ecded5',8);border(c,85,1293,731,167,t.accent);}
    if(t.id==='sketch'){border(c,91,788,713,448,t.accent);border(c,86,1286,728,177,t.accent);washi(c,589,1269,155,30,'#b9c9bf',.07,'dot');}
    return;
  }
  switch(t.id){
    case 'sketch':{
      border(c,104,100,624,121,'#555c47');border(c,103,253,622,356,'#b78d7c',2.5);border(c,108,642,388,149,'#bd9b7f');border(c,519,642,213,149,'#747e67');
      washi(c,127,80,132,39,'#b9c3d1',-.16,'gingham');washi(c,578,237,135,34,'#d7a29c',.05,'dot');washi(c,92,783,122,32,'#bbc7c3',-.11,'gingham');stem(c,96,248,.85,'#728363',true);stem(c,1507,807,.8,'#76846c',true);cat(c,699,209,49,'#ead4b5');break;
    }
    case 'cream':{
      torn(c,123,115,589,137,'#f1dba7',-.012);box(c,127,264,577,350,'#fffcf0',18);border(c,136,273,559,331,'#cbb995');torn(c,120,649,438,139,'#f1e2c3',.025);for(let i=0;i<11;i++)star(c,100+i*55,807,4+i%3,'#b4ae78');washi(c,946,155,143,41,'#d5bea2',-.19,'dot');cat(c,657,723,83,'#ead8b7');stem(c,1470,752,.8,'#93a07c',true);star(c,1453,143,18,'#e3c363');break;
    }
    case 'travel':{
      torn(c,125,104,583,144,'#ead8b7',-.014);torn(c,130,273,571,352,'#fff6df',-.006);torn(c,129,651,568,146,'#d8c7a4',.018);torn(c,871,99,610,596,'#d6d2b9',.018);
      for(let i=0;i<11;i++)line(c,895+i*45,110,925+i*43,680,'#9fa98b',1);for(let i=0;i<10;i++)line(c,888,126+i*53,1473,144+i*49,'#b4af93',1.2);washi(c,964,130,161,42,'#ad9c77',-.06,'stripe');ticket(c,902,687,555,111,'此刻，值得收藏','#d8b98e');postmark(c,703,113,'在 路 上');clip(c,112,59,.75);break;
    }
    case 'blue':{
      washi(c,89,72,208,82,'#a4bfd0',.03,'gingham');torn(c,157,93,570,145,'#ccdce5',-.035);torn(c,215,255,497,369,'#fbfaf1',.015);
      for(let i=0;i<7;i++)washi(c,233,270+i*44,430,27,i%3===0?'#d3dfe7':i%3===1?'#e8d0ca':'#e9d9ae',-.01,'stripe');torn(c,103,652,241,143,'#d5dfd9',-.04);torn(c,350,641,363,153,'#efd5c6',.02);stem(c,143,777,.75);clip(c,126,54,.78);washi(c,1389,113,114,47,'#9ab6ce',.2,'dot');break;
    }
    case 'forest':{
      torn(c,143,94,580,157,'#dce2c8',-.016);border(c,179,273,510,351,'#9aa185');torn(c,166,642,510,154,'#e5dcc1',.016);stem(c,113,602,2.4,'#7c8968');stem(c,727,783,1.5,'#829071',true);stem(c,923,709,2,'#8e9c76');stem(c,1475,741,2.4,'#758660');torn(c,941,123,494,72,'#e4e3ca');txt(c,'今天采集的光与影',976,169,26,'#6b795c');postmark(c,681,134,'植 物 记','#81916a');washi(c,1001,192,150,40,'#bbc7a7',-.1,'stripe');break;
    }
    case 'film':{
      box(c,105,98,608,147,'#d4d3c5');txt(c,'生活放映室',128,123,16,'#78816d',sans);line(c,127,251,705,251,'#6e7767',2);torn(c,123,659,567,144,'#dfd9c6',-.012);box(c,861,188,642,451,'#343e37',4);for(const yy of [199,614])for(let xx=878;xx<1490;xx+=34)box(c,xx,yy,19,13,'#e7e5d4',2);txt(c,'一 帧 日 常',905,158,32,'#596653');ticket(c,911,684,544,109,'留给未来的自己','#c8c2ab');clip(c,700,81,.6);star(c,1459,153,14,'#b2a06c');break;
    }
    case 'chat':{
      torn(c,119,105,593,145,'#e8ddce',-.014);box(c,113,263,595,362,'#fffdf5',12);torn(c,133,655,557,144,'#dce4d6',.012);for(let yy=291;yy<593;yy+=43){box(c,187,yy-17,493,38,'#e7ecdd',8);cat(c,153,yy+1,35,'#d2bda5');}washi(c,1002,122,145,37,'#c2ccbb',-.04,'stripe');postmark(c,700,147,'寄 给 我','#8a9278');cat(c,1455,768,68,'#d8c4a9');break;
    }
    case 'pocket':{
      torn(c,128,101,588,143,'#ecd7cc',.009);box(c,128,278,572,344,'#fffdf5',5);border(c,135,284,558,331,'#be9b8f');for(let xx=120;xx<720;xx+=53){c.strokeStyle='#9a8e77';c.lineWidth=4;c.beginPath();c.ellipse(xx,57,7,21,0,0,Math.PI*2);c.stroke();}torn(c,133,663,553,136,'#ecdfc8',-.012);washi(c,1397,131,105,45,'#c4b4b7',.2,'dot');cat(c,1439,784,55,'#e6cbb4');break;
    }
  }
  txt(c,d.date.replaceAll('-',' / '),g.title.x,79,17,t.accent,sans);
}
function photo(c:Ctx,m:LoadedMedia|undefined,r:MediaRect,d:Diary,t:Theme,index:number){
  const {x,y,w,h}=r,pad=d.theme==='cream'?17:10;shadow(c,()=>box(c,x-pad,y-pad,w+2*pad,h+2*pad+(d.theme==='cream'?25:0),'#fffdf4',1),7);
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();box(c,x,y,w,h,'#e5e6d6');
  if(m){const e=m.element,video=e instanceof HTMLVideoElement,ew=video?e.videoWidth:e.naturalWidth,eh=video?e.videoHeight:e.naturalHeight;if(ew&&eh){const scale=d.fit==='contain'?Math.min(w/ew,h/eh):Math.max(w/ew,h/eh);c.drawImage(e,x+(w-ew*scale)/2,y+(h-eh*scale)/2,ew*scale,eh*scale);}}
  else {box(c,x,y,w,h,'#f1eee5');const cx=x+w/2,cy=y+h/2,size=Math.min(w,h)*.1;line(c,cx-size,cy,cx+size,cy,'#bbb7a5',1.7);line(c,cx,cy-size,cx,cy+size,'#bbb7a5',1.7);c.textAlign='center';txt(c,'留给今天的回忆',cx,cy+size+Math.min(30,h*.16),Math.min(21,w/11),'#9d9b89');c.textAlign='left';}
  c.restore();if(d.decoration>0&&index<2)washi(c,x+Math.min(26,w*.1),y-21,Math.min(126,w*.49),30,d.theme==='blue'?'#9db7ca':d.theme==='cream'?'#d5bc9c':t.accent,-.08,index%2?'dot':'gingham');
}
function richText(c:Ctx,d:Diary,media:LoadedMedia[],text:string,x:number,y:number,size:number,color:string){
  c.font=`${size}px ${hand}`;c.fillStyle=color;
  for(const char of graphemes(text)){
    const kind=d.inlineStickers?.[char];
    if(kind){if(kind.startsWith('asset:')){const m=media.find(m=>m.asset.id===kind.slice(6)),e=m?.element;if(e instanceof HTMLImageElement){const scale=size/Math.max(e.naturalWidth,e.naturalHeight);c.drawImage(e,x+(size-e.naturalWidth*scale)/2,y-size*.83,e.naturalWidth*scale,e.naturalHeight*scale);}}else drawSticker(c,kind,x+size/2,y-size*.33,size);x+=size;}
    else{c.fillText(char,x,y);x+=c.measureText(char).width;}
  }
}
function writing(c:Ctx,d:Diary,t:Theme,g:Geometry,media:LoadedMedia[],content:TextLine[],time:number,animate:boolean,editingField?:EditingField){
  const rich=(s:string,x:number,y:number,size:number,color:string)=>richText(c,d,media,s,x,y,size,color);
  const measure=(text:string,size:number)=>measureInline(text,d.inlineStickers,size,s=>c.measureText(s).width);
  if(editingField!=='title'){c.font=`${d.ratio==='portrait'?43:37}px ${hand}`;wrapText(d.title||'今天的日记',g.title.w,s=>measure(s,d.ratio==='portrait'?43:37)).slice(0,2).forEach((s,i)=>rich(s,g.title.x,g.title.y+40+i*43,d.ratio==='portrait'?43:37,t.ink));}
  const lines=content.length?content:[{text:'给今天，留一点值得收藏的回忆。',paragraph:0,first:true}];c.font=`${g.body.size}px ${hand}`;
  const largest=Math.max(1,...lines.map(l=>measure(l.text,g.body.size)));
  const short=lines.length<=4&&d.theme!=='chat';
  const bodySize=short?Math.min(d.ratio==='portrait'?46:44,g.body.size*1.42,g.body.size*g.body.w/largest):g.body.size;
  const step=short?Math.min(g.body.step*1.5,g.body.h/lines.length):g.body.step;
  const offset=short?Math.max(0,(g.body.h-(lines.length-1)*step-bodySize)/2):0;
  if(editingField!=='body')lines.forEach((l,i)=>{c.save();c.globalAlpha=animate?Math.max(0,Math.min(1,(time-i*.25)*3)):1;rich(l.text,g.body.x,g.body.y+offset+bodySize+i*step,bodySize,t.ink);c.restore();});
  if(editingField!=='note'){txt(c,d.theme==='travel'?'路上的小记':d.theme==='film'?'观后感 / 小批注':'我的小批注',g.note.x,g.note.y+11,20,t.accent);c.font=`${d.ratio==='portrait'?26:23}px ${hand}`;wrapText(d.note||'把平凡的一天，认真收好。',g.note.w-5,s=>measure(s,d.ratio==='portrait'?26:23)).slice(0,2).forEach((s,i)=>rich(s,g.note.x,g.note.y+47+i*31,d.ratio==='portrait'?26:23,t.ink));}
  if(editingField!=='mood'){const mx=g.mood.x,my=g.mood.y;if(g.mood.w>250){const label=`今日心情  ${d.mood}`,fontSize=26;c.font=`${fontSize}px ${hand}`;const labels=wrapText(label,g.mood.w-76,s=>c.measureText(s).width).slice(0,2),width=Math.max(...labels.map(s=>c.measureText(s).width)),left=mx+(g.mood.w-width-76)/2;drawSticker(c,getMoodSticker(d.mood),left+30,my+30,60);labels.forEach((s,i)=>txt(c,s,left+70,my+(labels.length===1?36:21)+i*30,fontSize,t.ink));}else{txt(c,'今日心情',mx,my+6,20,t.accent);drawSticker(c,getMoodSticker(d.mood),mx+28,my+52,61);txt(c,d.mood.slice(0,7),mx+65,my+57,19,t.ink);}}
}
function userStickers(c:Ctx,d:Diary,page:number,media:LoadedMedia[],W:number,H:number){
  for(const s of d.stickers??[]){if(s.page!==page)continue;const pos=stickerPosition(s,d.ratio),x=pos.x*W,y=pos.y*H;if(s.kind.startsWith('asset:')){const image=media.find(m=>m.asset.id===s.kind.slice(6));if(image&&image.element instanceof HTMLImageElement){const e=image.element,scale=s.size/Math.max(e.naturalWidth,e.naturalHeight);c.save();c.translate(x,y);c.rotate(s.rotation);c.drawImage(e,-e.naturalWidth*scale/2,-e.naturalHeight*scale/2,e.naturalWidth*scale,e.naturalHeight*scale);c.restore();}}else if(s.kind.startsWith('emoji:')){c.save();c.translate(x,y);c.rotate(s.rotation);c.textAlign='center';c.textBaseline='middle';txt(c,s.kind.slice(6),0,0,s.size*.8,'#333','"Apple Color Emoji","Segoe UI Emoji",sans-serif');c.restore();}else drawSticker(c,s.kind,x,y,s.size,s.rotation);}
}
export function render(canvas:HTMLCanvasElement,d:Diary,pages:TextLine[][],page:number,media:LoadedMedia[],time=999,animate=false,editingField?:EditingField){
  const c=canvas.getContext('2d')!,[W,H]=dimensions(d),t=themes.find(t=>t.id===d.theme)??themes[0],g=geometry(d);c.save();c.scale(canvas.width/W,canvas.height/H);c.clearRect(0,0,W,H);book(c,d,t);decorations(c,d,t,g);mediaRects(d).forEach((r,i)=>photo(c,mediaForSlot(d,page,i,media),r,d,t,i));writing(c,d,t,g,media,pages[page]??[],time,animate,editingField);
  userStickers(c,d,page,media,W,H);c.textAlign='center';txt(c,`${String(page+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`,W/2,H-58,16,t.accent,sans);c.textAlign='left';c.restore();
}
