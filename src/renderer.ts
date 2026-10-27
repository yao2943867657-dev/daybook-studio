import { paginate, themes, wrapText, type Diary, type TextLine, type Theme } from './model';
import type { LoadedMedia } from './media';
const handwriting = '"KaiTi", "STKaiti", "Kaiti SC", "FangSong", serif';
type Ctx = CanvasRenderingContext2D;
export const dimensions = (d: Diary) => d.ratio==='portrait' ? [900,1600] : [1600,900];
export function pagesFor(d: Diary, minimumPages=1): TextLine[][] {
  const c=document.createElement('canvas').getContext('2d')!;
  c.font=`${d.ratio==='portrait'?34:30}px ${handwriting}`;
  const pages=paginate(d.body,d.ratio==='portrait'?646:500,d.ratio==='portrait'?8:7,s=>c.measureText(s).width);
  if(pages.length>=minimumPages)return pages;
  const all=pages.flat(),perPage=Math.max(1,Math.ceil(all.length/minimumPages));
  return Array.from({length:minimumPages},(_,i)=>all.slice(i*perPage,(i+1)*perPage));
}
function rect(c: Ctx,x:number,y:number,w:number,h:number,fill:string,r=0) {
  c.beginPath(); c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();
}
function text(c:Ctx,s:string,x:number,y:number,size:number,color:string,font=handwriting) {
  c.font=`${size}px ${font}`;c.fillStyle=color;c.fillText(s,x,y);
}
function line(c:Ctx,x:number,y:number,xx:number,yy:number,color:string,width=1) {
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
}
function frame(c:Ctx,x:number,y:number,w:number,h:number,color:string) {
  c.save();c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();
  c.moveTo(x+12,y+2);c.bezierCurveTo(x+w*.4,y-3,x+w*.7,y+4,x+w-6,y);
  c.quadraticCurveTo(x+w+2,y,x+w,y+12);c.lineTo(x+w-2,y+h-9);
  c.quadraticCurveTo(x+w,y+h+2,x+w-12,y+h);c.lineTo(x+8,y+h-2);
  c.quadraticCurveTo(x-3,y+h,x,y+h-12);c.lineTo(x+2,y+11);c.stroke();c.restore();
}
function tape(c:Ctx,x:number,y:number,w:number,color:string,angle=-.1) {
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=.62;
  c.fillStyle=color;c.beginPath();c.moveTo(0,3);c.lineTo(w,0);c.lineTo(w-4,32);c.lineTo(2,30);c.closePath();c.fill();
  for(let i=10;i<w;i+=17) line(c,i,2,i+4,29,'#ffffff65',2);c.restore();
}
function flower(c:Ctx,x:number,y:number,scale=1,color='#d9b870') {
  c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=2;c.strokeStyle='#768268';
  c.beginPath();c.moveTo(0,12);c.quadraticCurveTo(10,48,-5,87);c.stroke();
  c.fillStyle='#9ca788';c.beginPath();c.ellipse(12,48,7,20,.8,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(-8,66,6,17,-.8,0,Math.PI*2);c.fill();
  c.fillStyle=color;for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.ellipse(0,-11,7,13,0,0,Math.PI*2);c.fill();c.restore();}
  c.fillStyle='#8f7958';c.beginPath();c.arc(0,0,5,0,Math.PI*2);c.fill();c.restore();
}
function heart(c:Ctx,x:number,y:number,s:number,color:string) {
  c.save();c.translate(x,y);c.scale(s/30,s/30);c.fillStyle=color;c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-30,-10,-9,-28,0,-12);c.bezierCurveTo(9,-28,30,-10,0,8);c.fill();c.restore();
}
function doodle(c:Ctx,x:number,y:number,type:number,accent:string) {
  c.save();c.translate(x,y);c.strokeStyle='#68715a';c.lineWidth=2.1;c.lineCap='round';
  if(type===0) { // 小花
    flower(c,0,0,.45,accent);
  } else if(type===1) { // 手绘笑脸
    c.beginPath();c.arc(0,0,17,0,Math.PI*2);c.stroke();
    for(const k of [-6,6]){c.beginPath();c.arc(k,-3,1.5,0,Math.PI*2);c.stroke();}
    c.beginPath();c.arc(0,2,8,.2,Math.PI-.2);c.stroke();
    c.fillStyle=accent;c.globalAlpha=.5;c.beginPath();c.ellipse(-11,5,4,2,0,0,Math.PI*2);c.fill();
  } else { // 小信封
    frame(c,-19,-13,38,26,'#6c765e');line(c,-18,-11,0,3,'#6c765e',1.7);line(c,0,3,18,-11,'#6c765e',1.7);heart(c,0,7,9,accent);
  }
  c.restore();
}
function paper(c:Ctx,x:number,y:number,w:number,h:number,t:Theme) {
  rect(c,x,y,w,h,t.paper,7);
  let seed=42;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  c.fillStyle='#66543a';c.globalAlpha=.065;
  for(let i=0;i<3600;i++){const px=x+random()*w,py=y+random()*h;c.fillRect(px,py,.5+random(),.5+random());}c.globalAlpha=1;
  if(['sketch','chat','forest'].includes(t.id)) {
    c.fillStyle='#7b796133';for(let yy=y+20;yy<y+h-10;yy+=22)for(let xx=x+18;xx<x+w-8;xx+=22)c.fillRect(xx,yy,1.1,1.1);
  }else if(t.id==='blue'){
    for(let xx=x+20;xx<x+w;xx+=24)line(c,xx,y,xx,y+h,'#728ca419');
    for(let yy=y+20;yy<y+h;yy+=24)line(c,x,yy,x+w,yy,'#728ca419');
  }else if(['cream','travel'].includes(t.id)) for(let yy=y+155;yy<y+h-20;yy+=44)line(c,x+26,yy,x+w-26,yy,'#a1916c20');
}
function drawMedia(c:Ctx,m:LoadedMedia|undefined,x:number,y:number,w:number,h:number,d:Diary,t:Theme) {
  rect(c,x-13,y-13,w+26,h+26,'#fffef8',2);
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=t.paper;c.fillRect(x,y,w,h);
  if(m) {
    const e=m.element;const mw=e instanceof HTMLVideoElement?e.videoWidth:e.naturalWidth;const mh=e instanceof HTMLVideoElement?e.videoHeight:e.naturalHeight;
    if(mw&&mh){const scale=d.fit==='cover'?Math.max(w/mw,h/mh):Math.min(w/mw,h/mh);c.drawImage(e,x+(w-mw*scale)/2,y+(h-mh*scale)/2,mw*scale,mh*scale);}
  }else{
    rect(c,x,y,w,h,'#e5e9db');flower(c,x+w/2,y+h/2-35,1.6,t.accent);
    c.textAlign='center';text(c,'放一张今天的照片',x+w/2,y+h*.78,28,'#67745e');c.textAlign='left';
  }
  c.restore();
  if(t.id==='film'){
    for(const side of [x-25,x+w+9]){rect(c,side,y-13,17,h+26,'#414642');for(let yy=y;yy<y+h;yy+=30)rect(c,side+4,yy,8,15,t.paper,1);}
  }else if(d.decoration>0){tape(c,x+20,y-27,115,t.accent,-.1);tape(c,x+w-110,y+h-12,108,t.accent,-.2);}
}
export function activeMedia(d:Diary,page:number,media:LoadedMedia[]) {
  return media.find(m=>m.asset.id===d.pageMedia[String(page)]) ?? media[page%media.length];
}
export function render(canvas:HTMLCanvasElement,d:Diary,pages:TextLine[][],page:number,media:LoadedMedia[],time=999,animate=false) {
  const c=canvas.getContext('2d')!; const [W,H]=dimensions(d);const t=themes.find(t=>t.id===d.theme)!;
  c.save();c.scale(canvas.width/W,canvas.height/H);c.clearRect(0,0,W,H);
  rect(c,0,0,W,H,'#e8eae2');
  const portrait=d.ratio==='portrait', bx=portrait?35:45,by=35,bw=W-bx*2,bh=H-80;
  c.shadowColor='#39453532';c.shadowBlur=25;c.shadowOffsetY=13;rect(c,bx-8,by-8,bw+16,bh+16,t.cover,16);c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;
  for(let i=3;i>0;i--)rect(c,bx-1,by+i*3,bw+2,bh+5,'#d5d2c2',9);
  paper(c,bx,by,bw,bh,t);
  if(!portrait){
    const grad=c.createLinearGradient(775,0,825,0);grad.addColorStop(0,'#4b432000');grad.addColorStop(.45,'#554c3224');grad.addColorStop(.52,'#4f463334');grad.addColorStop(.61,'#ffffffa0');grad.addColorStop(1,'#4b432000');rect(c,775,by,50,bh,grad as unknown as string);
    if(t.id==='blue')for(let yy=by+60;yy<by+bh;yy+=100){c.strokeStyle='#74818b';c.lineWidth=5;c.beginPath();c.ellipse(800,yy,24,10,-.15,0,Math.PI*2);c.stroke();line(c,780,yy-5,780,yy+7,'#eef3f7',3);}
  }
  const content=pages[page]?.length?pages[page]:[{text:'给今天，多留一张照片。',paragraph:0,first:true}];const m=activeMedia(d,page,media);
  const title=d.title||'今天的日记';
  if(portrait){
    text(c,d.date.replaceAll('-',' / '),90,96,22,t.accent,'sans-serif');
    const ts=wrapText(title,690,s=>{c.font=`44px ${handwriting}`;return c.measureText(s).width;});
    ts.slice(0,2).forEach((s,i)=>text(c,s,90,160+i*51,44,t.ink));
    drawMedia(c,m,100,267,700,415,d,t);
    text(c,`今日心情  /  ${d.mood}`,100,748,24,t.accent);
    content.forEach((l,i)=>{
      const alpha=animate?Math.max(0,Math.min(1,(time-i*.25)*3)):1;c.globalAlpha=alpha;
      text(c,l.text,108,825+i*53,34,t.ink);
    });c.globalAlpha=1;
    frame(c,85,1305,730,125,t.accent);text(c,'写在最后',110,1340,22,t.accent);
    c.font=`25px ${handwriting}`;wrapText(d.note||'把平凡的一天，认真收好。',665,s=>c.measureText(s).width).slice(0,2).forEach((s,i)=>text(c,s,110,1380+i*30,25,t.ink));
    if(d.decoration)flower(c,771,1170,.75,t.accent);
  }else{
    text(c,'今日成册',110,95,18,t.accent,'sans-serif');
    text(c,d.date.replaceAll('-',' / '),540,95,18,t.accent,'sans-serif');
    c.font=`39px ${handwriting}`;const titleLines=wrapText(title,600,s=>c.measureText(s).width);
    titleLines.slice(0,2).forEach((s,i)=>text(c,s,112,155+i*43,39,t.ink));
    if(['sketch','forest'].includes(t.id)) {frame(c,99,230,638,370,t.accent);if(d.decoration)flower(c,703,161,.55,t.accent);}
    if(t.id==='travel') {tape(c,520,225,150,'#aaa081',.05);rect(c,115,248,593,340,'#fff8e85c');}
    if(t.id==='blue') {rect(c,110,236,610,373,'#dce7ed');rect(c,123,248,595,358,'#fffef4');tape(c,110,230,120,t.accent,-.13);}
    if(t.id==='cream') {rect(c,116,246,595,345,'#fffdf17a',25);if(d.decoration)heart(c,687,212,22,t.accent);}
    if(t.id==='pocket') {rect(c,108,239,610,368,'#f2ddd34d',8);text(c,'一小页生活',130,215,20,t.accent);}
    content.forEach((l,i)=>{
      c.save();const alpha=animate?Math.max(0,Math.min(1,(time-i*.27)*3)):1;c.globalAlpha=alpha;
      const yy=289+i*44;
      if(t.id==='chat'){
        rect(c,164,yy-29,Math.min(538,c.measureText(l.text).width+25),40,'#e5eade',8);
        if(l.first) {c.fillStyle=t.accent;c.beginPath();c.arc(135,yy-10,15,0,Math.PI*2);c.fill();text(c,'我',124,yy-2,19,'#fffdf5');}
        text(c,l.text,175,yy,28,t.ink);
      }else text(c,l.text,140,yy,30,t.ink);
      c.restore();
    });
    if(d.decoration>0&&t.id!=='chat') {
      const used=Math.min(content.length,7);if(used<7)doodle(c,186,327+used*40,1,t.accent);
    }
    const ny=639;
    frame(c,103,ny,390,125,t.accent);rect(c,115,ny-15,108,30,t.id==='blue'?'#dce7ed':'#e6e7da');text(c,'我的小批注',124,ny+7,21,t.ink);
    c.font=`23px ${handwriting}`;wrapText(d.note||'把平凡的一天，认真收好。',345,s=>c.measureText(s).width).slice(0,2).forEach((s,i)=>text(c,s,126,ny+47+i*33,23,t.ink));
    frame(c,513,ny,220,125,t.accent);rect(c,529,ny-14,94,28,t.paper);text(c,'今日心情',535,ny+7,21,t.ink);doodle(c,558,ny+54,1,t.accent);
    text(c,d.mood.slice(0,7),594,ny+61,21,t.ink);heart(c,699,ny+96,12,t.accent);
    let mx=865,my=155,mw=620,mh=558;
    if(t.id==='film'){mx=884;my=155;mw=580;mh=545;}
    if(t.id==='travel') {c.save();c.translate(1175,430);c.rotate(.015);drawMedia(c,m,-mw/2,-mh/2,mw,mh,d,t);c.restore();
      frame(c,1180,747,283,52,t.accent);text(c,'此刻，值得收藏',1200,781,24,t.ink);
    }else if(t.id==='blue'){
      rect(c,845,133,660,600,'#bdcfdb');drawMedia(c,m,mx,my,mw,mh,d,t);
    }else drawMedia(c,m,mx,my,mw,mh,d,t);
    if(t.id!=='travel') {c.textAlign='center';text(c,t.id==='film'?'生活的每一帧，都有自己的光。':'一些平凡，又珍贵的瞬间。',1175,778,25,t.accent);c.textAlign='left';}
    if(d.decoration===2){flower(c,1494,744,.65,t.accent);doodle(c,1440,107,2,t.accent);}
  }
  c.textAlign='center';text(c,`${String(page+1).padStart(2,'0')}  /  ${String(pages.length).padStart(2,'0')}`,W/2,H-61,17,t.accent,'sans-serif');c.textAlign='left';
  c.restore();
}
