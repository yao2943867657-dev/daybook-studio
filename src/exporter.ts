import { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource,
  Input, BlobSource, ALL_FORMATS, AudioBufferSink, canEncodeVideo, canEncodeAudio } from 'mediabunny';
import type { Diary, TextLine } from './model';
import { render, mediaRects, mediaForSlot } from './renderer';
import { seek, type LoadedMedia } from './media';
export interface ExportOptions { format: 'mp4'|'webm'; size: number; signal: AbortSignal; progress: (value:number,message:string)=>void }
function check(signal:AbortSignal){if(signal.aborted)throw new DOMException('导出已取消','AbortError');}
async function pageAudio(m:LoadedMedia|undefined,seconds:number,signal:AbortSignal):Promise<AudioBuffer> {
  const ctx=new OfflineAudioContext(2,Math.round(seconds*48000),48000);
  if(m?.asset.type==='video') {
    const input=new Input({source:new BlobSource(m.asset.blob),formats:ALL_FORMATS});
    try {
      const track=await input.getPrimaryAudioTrack();
      if(track){
        if(!await track.canDecode())throw new Error(`无法读取“${m.asset.name}”的原声，请关闭原声后导出，或更换视频`);
        const sink=new AudioBufferSink(track); const first=await track.getFirstTimestamp();
        for await(const wrapped of sink.buffers(first,first+seconds)) {
          check(signal); const node=ctx.createBufferSource();node.buffer=wrapped.buffer;node.connect(ctx.destination);
          node.start(Math.max(0,wrapped.timestamp-first));
        }
      }
    } finally {input.dispose();}
  }
  check(signal);return ctx.startRendering();
}
export async function exportVideo(d:Diary,pages:TextLine[][],media:LoadedMedia[],o:ExportOptions):Promise<Blob> {
  const total=pages.length*d.seconds;
  if(total>180)throw new Error('首版视频导出暂支持 3 分钟以内。请缩短日记或减小每页时长；完整内容仍可备份。');
  const portrait=d.ratio==='portrait';const width=portrait?o.size:Math.round(o.size*16/9/2)*2;
  const height=portrait?Math.round(o.size*16/9/2)*2:o.size;
  const codec=o.format==='mp4'?'avc':'vp9',audioCodec=o.format==='mp4'?'aac':'opus';
  if(!await canEncodeVideo(codec,{width,height,bitrate:4_000_000,frameRate:24}))throw new Error('此浏览器不支持所选视频编码。请尝试 WebM 或 720p，或使用新版 Chrome/Edge。');
  const audio=d.originalAudio&&media.some(m=>m.asset.type==='video');
  if(audio&&!await canEncodeAudio(audioCodec,{numberOfChannels:2,sampleRate:48000,bitrate:128000}))throw new Error('此浏览器不支持原声音频编码。请尝试 WebM 或关闭原声后导出。');
  check(o.signal);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const target=new BufferTarget();
  const output=new Output({format:o.format==='mp4'?new Mp4OutputFormat():new WebMOutputFormat(),target});
  const video=new CanvasSource(canvas,{codec,bitrate:4_000_000});output.addVideoTrack(video,{frameRate:24});
  const sound=audio?new AudioBufferSource({codec:audioCodec,bitrate:128000}):undefined;
  if(sound)output.addAudioTrack(sound);
  let done=false;
  try {
    await output.start();const frames=Math.round(d.seconds*24);
    for(let p=0;p<pages.length;p++){
      check(o.signal);const shown=[...new Set(mediaRects(d).map((_,i)=>mediaForSlot(d,p,i,media)))];
      const m=shown.find(m=>m?.asset.type==='video');
      if(sound){o.progress(p/pages.length,`正在读取第 ${p+1} 页原声`);await sound.add(await pageAudio(m,d.seconds,o.signal));}
      for(let f=0;f<frames;f++) {
        check(o.signal);await Promise.all(shown.map(m=>seek(m,f/24)));render(canvas,d,pages,p,media,f/24,true);
        await video.add(p*d.seconds+f/24,1/24);
        if(f%8===0){o.progress((p*frames+f)/(pages.length*frames),`正在生成第 ${p+1} / ${pages.length} 页`);await new Promise(r=>setTimeout(r,0));}
      }
    }
    video.close();sound?.close();o.progress(.98,'正在整理视频文件');await output.finalize();done=true;
    return new Blob([target.buffer!],{type:o.format==='mp4'?'video/mp4':'video/webm'});
  }finally{if(!done)await output.cancel().catch(()=>{});for(const m of media)await seek(m,0).catch(()=>{});}
}
