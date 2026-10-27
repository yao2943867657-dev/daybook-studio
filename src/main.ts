import './style.css';
import { themes, initialDiary, type Diary, type Asset, type TextLine } from './model';
import { prepare, release, seek, sampleAssets, type LoadedMedia } from './media';
import { pagesFor, render, dimensions, activeMedia } from './renderer';
import { load, save, pack, unpack, download } from './storage';
const icons:Record<string,string>={
  book:'<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 4-6 5 7"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',play:'<path d="m8 4 12 8-12 8Z"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',check:'<path d="m5 12 4 4L19 6"/>',folder:'<path d="M3 7V4h6l3 3h9v13H3Z"/>',
  leaf:'<path d="M5 20Q2 4 20 3q0 17-14 14M5 20 16 8"/>',undo:'<path d="M7 4 2 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
};
const icon=(name:string)=>`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.book}</svg>`;
const esc=(v:string)=>v.replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]!));
let diary:Diary=initialDiary(),assets:Asset[]=[],media:LoadedMedia[]=[],pages:TextLine[][]=[],page=0;
let playing=false,raf=0,saveTimer:ReturnType<typeof setTimeout>,busy=false,controller:AbortController|undefined;
let deferredInstall:Event & {prompt?:()=>Promise<void>}|undefined;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header class="topbar"><a class="brand" href="./" aria-label="今日成册首页"><span class="brand-mark">${icon('book')}</span><span>今日成册<small>Daybook Studio</small></span></a>
<div class="top-caption">把今天，收进一本日记。</div><nav aria-label="工程操作"><span id="save-state" role="status">准备好了</span><button class="quiet" id="install">安装到桌面</button><button class="icon-button" id="import-project" title="打开工程包" aria-label="打开工程包">${icon('folder')}</button><button class="quiet" id="backup">备份工程</button><button class="primary" id="export-open">${icon('download')} 导出作品</button></nav></header>
<main class="workspace">
<aside class="editor" aria-label="日记编辑">
<div class="editor-intro"><h1>今天，想记点什么？</h1><p>照片、几句话，就是一页好日子。</p></div>
<section><div class="section-title"><h2><span>1</span> 放入今天的素材</h2><span id="asset-count">0 / 20</span></div>
<label class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="添加照片或视频">${icon('plus')}<strong>添加照片 / 视频</strong><small>点击选择，也可以拖到这里</small><input id="media-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple hidden></label>
<div class="asset-list" id="assets"></div><p class="field-hint">支持 JPG、PNG、WebP、GIF、MP4、WebM、MOV<br>视频从开头播放；首版导出不保留 GIF 动画。</p></section>
<section><div class="section-title"><h2><span>2</span> 写下今天</h2><button id="new-diary" class="text-button">新的一页</button></div>
<label class="field">日期<input id="date" type="date"></label>
<label class="field">日记标题<input id="title" maxlength="60" placeholder="给今天起个名字"></label>
<label class="field">今天的日记<textarea id="body" maxlength="10000" rows="8" placeholder="今天发生了什么？一小件事也值得记录。"></textarea></label>
<div class="field-meta"><span>内容多了会自动续页</span><span id="word-count"></span></div>
<label class="field">我的小批注<input id="note" maxlength="120" placeholder="想对自己说的一句话"></label>
<label class="field">今日心情<select id="mood"><option>小小的幸福</option><option>元气满满</option><option>平静自在</option><option>有点想你</option><option>需要抱抱</option><option>明天会更好</option></select></label>
</section><p class="local-note">${icon('leaf')}素材与日记保存在当前浏览器。<br>记得备份工程，就能换设备继续写。</p></aside>
<section class="studio" aria-label="日记预览与模板">
<div class="stage-toolbar"><div class="preview-title"><span class="status-dot"></span>你的日记，正在成册</div><div class="segmented" aria-label="画面比例"><button data-ratio="landscape">横屏双页</button><button data-ratio="portrait">手机竖屏</button></div></div>
<div class="canvas-stage"><div class="stage-stamp">A LITTLE BOOK OF YOUR EVERYDAY</div><canvas id="preview" width="1600" height="900" role="img" aria-label="日记排版预览"></canvas><div class="stage-bottom"><span id="theme-caption"></span><span>文字、影像，和一点点生活的温度。</span></div></div>
<div class="playback"><button class="quiet" id="play">${icon('play')} 播放预览</button><div class="pagination"><button class="icon-button previous" id="prev" aria-label="上一页">${icon('chevron')}</button><span id="page-label">1 / 1</span><button class="icon-button" id="next" aria-label="下一页">${icon('chevron')}</button></div><label class="page-media">本页素材 <select id="page-media" aria-label="本页对应素材"></select></label></div>
<div class="template-heading"><div><h2>选一本喜欢的本子</h2><p>换一种纸张，也换一种记住今天的方式。</p></div><span>8 种心情，随时换</span></div>
<div class="templates" id="templates">${themes.map(t=>`<button class="template" data-theme="${t.id}" aria-pressed="false"><canvas data-thumb="${t.id}" width="240" height="140" aria-hidden="true"></canvas><span class="template-name">${t.name}<i>${icon('check')}</i></span><small>${t.hint}</small></button>`).join('')}</div>
<details class="more-options"><summary>纸张装饰与播放设置</summary><div class="option-grid"><label class="field">装饰多少<select id="decoration"><option value="0">清爽</option><option value="1">适中</option><option value="2">丰富</option></select></label><label class="field">图片显示<select id="fit"><option value="cover">铺满画框</option><option value="contain">显示完整图片</option></select></label><label class="field">每页停留<select id="seconds"><option value="3">3 秒</option><option value="6">6 秒</option><option value="9">9 秒</option><option value="12">12 秒</option></select></label><label class="checkbox"><input id="original-audio" type="checkbox">保留视频原声</label></div><p class="field-hint">首版使用逐句入页，换页直接切换。纸页卷曲翻动与人物口型留待后续版本。</p></details>
<footer class="studio-footer"><span>本地创作 · 无需账号 · 开源项目</span><button class="text-button" id="sample">看看示例日记</button></footer>
</section></main>
<input id="project-input" type="file" accept=".zip" hidden>
<dialog id="export-dialog"><form method="dialog"><div class="dialog-heading"><div><h2>把今天带走</h2><p>导出一张日记，或一本会动的小书。</p></div><button class="icon-button" aria-label="关闭">×</button></div></form><div class="export-choices"><button class="export-card" id="export-png">${icon('image')}<strong>日记图片</strong><span>保存当前页 · PNG</span></button><button class="export-card" id="export-video">${icon('play')}<strong>日记视频</strong><span>包含全部页 · 24 帧/秒</span></button></div><div class="export-settings"><label class="field">视频格式<select id="format"><option value="mp4">MP4（优先）</option><option value="webm">WebM（备选）</option></select></label><label class="field">清晰度<select id="size"><option value="720">720p · 更轻巧</option><option value="1080">1080p · 更清晰</option></select></label></div><p class="field-hint">视频最长 3 分钟。导出期间请保持页面在前台。设备不支持 MP4 时，可尝试 WebM。</p><div id="export-progress" hidden><progress max="1" value="0"></progress><p role="status" id="progress-text"></p><button class="quiet" id="cancel-export">取消导出</button></div><p id="export-error" role="alert"></p><div id="export-result" hidden><video controls playsinline aria-label="导出成片预览"></video><a class="primary" download>保存视频</a><small>若手机未弹出保存窗口，可使用视频菜单分享或保存。</small></div></dialog>
<dialog id="message-dialog"><h2 id="message-title"></h2><p id="message-body"></p><div class="dialog-actions"><button id="message-cancel" class="quiet">取消</button><button id="message-ok" class="primary">知道了</button></div></dialog>
<div id="toast" role="status" class="toast" hidden></div>`;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const canvas=$<HTMLCanvasElement>('#preview');const exportDialog=$<HTMLDialogElement>('#export-dialog');
let toastTimer:ReturnType<typeof setTimeout>,resultURL='';
function toast(message:string){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function message(title:string,body:string,confirm=false):Promise<boolean>{
  const dialog=$<HTMLDialogElement>('#message-dialog');$('#message-title').textContent=title;$('#message-body').textContent=body;$('#message-cancel').hidden=!confirm;$('#message-ok').textContent=confirm?'继续':'知道了';dialog.showModal();
  return new Promise(resolve=>{const end=(ok:boolean)=>{dialog.close();resolve(ok);};$('#message-ok').onclick=()=>end(true);$('#message-cancel').onclick=()=>end(false);dialog.oncancel=e=>{e.preventDefault();end(false);};});
}
function fill(){
  for(const key of ['date','title','body','note','mood','fit','seconds','decoration'] as const) $<HTMLInputElement|HTMLSelectElement>(`#${key}`).value=String(diary[key]);
  $<HTMLInputElement>('#original-audio').checked=diary.originalAudio;
}
function stop(){playing=false;cancelAnimationFrame(raf);for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.pause();$('#play').innerHTML=`${icon('play')} 播放预览`;}
function paint(){render(canvas,diary,pages,page,media);}
function refresh(thumbnails=false){
  pages=pagesFor(diary,Math.max(1,assets.length));page=Math.min(page,pages.length-1);
  const [w,h]=dimensions(diary);canvas.width=w;canvas.height=h;canvas.classList.toggle('portrait',diary.ratio==='portrait');
  $('#page-label').textContent=`${page+1} / ${pages.length}`;$<HTMLButtonElement>('#prev').disabled=page===0;$<HTMLButtonElement>('#next').disabled=page===pages.length-1;
  $('#word-count').textContent=`${diary.body.length} 字`;
  $('#theme-caption').textContent=themes.find(t=>t.id===diary.theme)!.name;
  document.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b=>b.classList.toggle('active',b.dataset.ratio===diary.ratio));
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>{const selected=b.dataset.theme===diary.theme;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  const select=$<HTMLSelectElement>('#page-media');select.innerHTML='<option value="">按顺序自动匹配</option>'+assets.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');select.value=diary.pageMedia[String(page)]??'';
  paint();
  if(thumbnails)document.querySelectorAll<HTMLCanvasElement>('[data-thumb]').forEach(c=>{
    const td={...diary,ratio:'landscape',theme:c.dataset.thumb} as Diary;render(c,td,pagesFor(td),0,media);
  });
}
function changed(thumbnails=false){stop();refresh(thumbnails);clearTimeout(saveTimer);$('#save-state').textContent='正在保存…';saveTimer=setTimeout(()=>{save(diary,assets).then(()=>$('#save-state').textContent='已保存在本机').catch(()=>{$('#save-state').textContent='保存失败，请备份';toast('浏览器存储不足或不可用，请备份工程后再继续');});},500);}
function assetList(){
  $('#asset-count').textContent=`${assets.length} / 20`;
  $('#assets').innerHTML=media.map((m,i)=>`<div class="asset"><div class="asset-picture">${m.asset.type==='image'?`<img src="${esc(m.url)}" alt="${esc(m.asset.name)}">`:`<video src="${esc(m.url)}" muted playsinline preload="metadata"></video><span class="video-badge">视频</span>`}</div><span class="asset-name" title="${esc(m.asset.name)}">${esc(m.asset.name)}</span><div class="asset-actions"><button data-move="${i}" aria-label="将素材 ${i+1} 前移" title="前移" ${i===0?'disabled':''}>↑</button><button data-remove="${i}" aria-label="移除素材 ${i+1}" title="移除">×</button></div></div>`).join('');
}
async function attach(list:Asset[]){
  const ready:LoadedMedia[]=[];try{for(const a of list)ready.push(await prepare(a));}catch(e){release(ready);throw e;}
  stop();release(media);assets=list;media=ready;assetList();refresh(true);
}
async function addFiles(files:File[]){
  if(busy||!files.length)return;busy=true;$('#dropzone').classList.add('loading');$('.workspace').inert=true;$('.topbar').inert=true;
  let accepted=0;
  try{
    for(const file of files){
      if(assets.length>=20){toast('最多放入 20 份素材');break;}
      if(file.size>200*1024*1024) {toast(`“${file.name}”超过 200 MB，请先压缩`);continue;}
      if(!/^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(file.type)){toast(`暂不支持“${file.name}”，请转成 JPG、PNG 或 MP4`);continue;}
      const a:Asset={id:crypto.randomUUID(),name:file.name,type:file.type.startsWith('video')?'video':'image',blob:file};
      try{const m=await prepare(a);if(assets.length===1&&assets[0].id==='sample-picnic'){release(media);assets=[];media=[];diary.pageMedia={};}assets.push(a);media.push(m);accepted++;}catch(e){toast((e as Error).message);}
    }
    if(accepted){assetList();changed(true);toast(`已添加 ${accepted} 份素材`);}
  }finally{busy=false;$('.workspace').inert=false;$('.topbar').inert=false;$('#dropzone').classList.remove('loading');$<HTMLInputElement>('#media-input').value='';}
}
for(const key of ['date','title','body','note','mood','fit','seconds','decoration'] as const){
  $(`#${key}`).addEventListener('input',()=>{if(busy)return;const value=$<HTMLInputElement|HTMLSelectElement>(`#${key}`).value;(diary as unknown as Record<string,unknown>)[key]=['seconds','decoration'].includes(key)?Number(value):value;changed(key==='fit'||key==='decoration');});
}
$('#original-audio').onchange=()=>{diary.originalAudio=$<HTMLInputElement>('#original-audio').checked;changed();};
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.onclick=()=>{if(busy)return;diary.theme=b.dataset.theme as Diary['theme'];if(diary.theme==='pocket')diary.ratio='portrait';changed();});
document.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b=>b.onclick=()=>{if(busy)return;diary.ratio=b.dataset.ratio as Diary['ratio'];changed();});
$('#page-media').onchange=()=>{diary.pageMedia[String(page)]=$<HTMLSelectElement>('#page-media').value;changed();};
$('#prev').onclick=()=>{stop();page=Math.max(0,page-1);refresh();};$('#next').onclick=()=>{stop();page=Math.min(pages.length-1,page+1);refresh();};
$('#assets').onclick=e=>{
  if(busy)return;const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
  if(b.dataset.remove!==undefined){stop();const i=Number(b.dataset.remove);const id=assets[i].id;release([media[i]]);media.splice(i,1);assets.splice(i,1);for(const key of Object.keys(diary.pageMedia))if(diary.pageMedia[key]===id)delete diary.pageMedia[key];}
  if(b.dataset.move!==undefined){const i=Number(b.dataset.move);if(i>0){[assets[i-1],assets[i]]=[assets[i],assets[i-1]];[media[i-1],media[i]]=[media[i],media[i-1]];}}
  assetList();changed(true);
};
$<HTMLInputElement>('#media-input').onchange=e=>void addFiles(Array.from((e.target as HTMLInputElement).files??[]));
$('#dropzone').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$<HTMLInputElement>('#media-input').click();}};
$('#dropzone').ondragover=e=>{e.preventDefault();$('#dropzone').classList.add('dragging');};$('#dropzone').ondragleave=()=>$('#dropzone').classList.remove('dragging');
$('#dropzone').ondrop=e=>{e.preventDefault();$('#dropzone').classList.remove('dragging');void addFiles(Array.from(e.dataTransfer?.files??[]));};
$('#play').onclick=async()=>{
  if(playing){stop();paint();return;}stop();playing=true;$('#play').innerHTML='Ⅱ 暂停预览';
  const start=performance.now(),startPage=page;let oldPage=-1;
  const tick=()=>{
    if(!playing)return;const elapsed=(performance.now()-start)/1000;
    const p=startPage+Math.floor(elapsed/diary.seconds);if(p>=pages.length){stop();paint();return;}
    if(p!==oldPage){for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.pause();page=p;refresh();oldPage=p;
      const m=activeMedia(diary,p,media);if(m?.element instanceof HTMLVideoElement){m.element.currentTime=0;m.element.muted=!diary.originalAudio;void m.element.play().catch(()=>toast('视频未能自动播放，请重新点击播放'));}}
    render(canvas,diary,pages,p,media,elapsed%diary.seconds,true);raf=requestAnimationFrame(tick);
  };tick();
};
async function replaceWith(d:Diary,a:Asset[]){await attach(a);diary=d;page=0;fill();changed(true);}
$('#new-diary').onclick=async()=>{if(!await message('开始新日记？','当前日记会被替换。需要保留时，请先备份工程。',true))return;try{const d=initialDiary();d.body='';d.title='';d.note='';await replaceWith(d,[]);}catch(e){toast((e as Error).message);}};
$('#sample').onclick=async()=>{if(!await message('打开示例日记？','当前编辑内容会被替换。请先备份需要保留的日记。',true))return;try{await replaceWith(initialDiary(),sampleAssets());}catch(e){toast((e as Error).message);}};
$('#backup').onclick=async()=>{if(busy)return;try{toast('正在打包日记与素材…');download(await pack(diary,assets),`今日成册-${diary.date}.zip`);toast('工程包已准备好，包含文字与原始素材');}catch(e){toast((e as Error).message);}};
$('#import-project').onclick=()=>$<HTMLInputElement>('#project-input').click();
$<HTMLInputElement>('#project-input').onchange=async e=>{
  const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
  if(!await message('打开这个工程？','它会替换当前日记。请先备份需要保留的内容。',true))return;
  busy=true;try{const p=await unpack(file);await replaceWith(p.diary,p.assets);toast('工程已恢复，可以继续写了');}catch(e){toast((e as Error).message);}finally{busy=false;(e.target as HTMLInputElement).value='';}
};
$('#export-open').onclick=()=>{stop();$('#export-error').textContent='';exportDialog.showModal();};
$('#export-png').onclick=async()=>{
  const output=document.createElement('canvas');const [w,h]=dimensions(diary);output.width=w;output.height=h;render(output,diary,pages,page,media);
  output.toBlob(blob=>{if(blob){download(blob,`今日成册-${diary.date}-${page+1}.png`);toast('日记图片已准备好');}else $('#export-error').textContent='图片导出失败，请重试';},'image/png');
};
$('#export-video').onclick=async()=>{
  if(busy)return;busy=true;stop();controller=new AbortController();$('#export-error').textContent='';$('#export-progress').hidden=false;$('#export-result').hidden=true;
  $<HTMLButtonElement>('#export-video').disabled=true;$<HTMLButtonElement>('#export-png').disabled=true;
  $('.workspace').inert=true;$('.topbar').inert=true;
  try{
    for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.muted=true;
    const { exportVideo }=await import('./exporter');const format=$<HTMLSelectElement>('#format').value as 'mp4'|'webm';
    const blob=await exportVideo(structuredClone(diary),pages,media,{format,size:Number($<HTMLSelectElement>('#size').value),signal:controller.signal,progress:(v,msg)=>{$<HTMLProgressElement>('progress').value=v;$('#progress-text').textContent=`${msg} · ${Math.round(v*100)}%`;}});
    if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(blob);
    $<HTMLVideoElement>('#export-result video').src=resultURL;const a=$<HTMLAnchorElement>('#export-result a');a.href=resultURL;a.download=`今日成册-${diary.date}.${format}`;$('#export-result').hidden=false;
    $('#progress-text').textContent=`视频生成完成 · ${(blob.size/1024/1024).toFixed(1)} MB`;
  }catch(e){$('#export-error').textContent=(e as Error).name==='AbortError'?'已取消导出，日记仍保留。':(e as Error).message;}
  finally{busy=false;controller=undefined;$('.workspace').inert=false;$('.topbar').inert=false;$<HTMLButtonElement>('#export-video').disabled=false;$<HTMLButtonElement>('#export-png').disabled=false;$('#export-progress').hidden=true;paint();}
};
$('#cancel-export').onclick=()=>controller?.abort();
exportDialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});exportDialog.querySelector('form')!.addEventListener('submit',e=>{if(busy)e.preventDefault();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
$('#install').onclick=async()=>{if(deferredInstall?.prompt)await deferredInstall.prompt();else await message('把今日成册放到桌面','电脑：在 Chrome / Edge 菜单中选择“安装此应用”。iPhone：用 Safari 打开 HTTPS 地址，点分享 → 添加到主屏幕。Android：在浏览器菜单中选择安装或添加到主屏幕。离线使用前请先联网打开一次。');};
window.addEventListener('beforeunload',()=>{if(busy)controller?.abort();});
async function boot(){
  try{const stored=await load();if(stored){diary=stored.diary;await attach(stored.assets);$('#save-state').textContent='已恢复上次日记';}else{await attach(sampleAssets());$('#save-state').textContent='示例日记';}}
  catch(e){toast(`恢复失败：${(e as Error).message}。可以导入工程包恢复。`);await attach(sampleAssets());}
  fill();refresh(true);
  if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>toast('离线缓存暂不可用，联网状态仍可继续使用'));
}
void boot();
