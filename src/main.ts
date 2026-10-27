import './style.css';
import './notebook.css';
import './inline-editor.css';
import './workspace-ui.css';
import { bodyPageRange, replaceBodyRange } from './text-editing';
import { themes, initialDiary, localDate, sortEntries, calendarCells, slotCount, stickerPosition, type StickerPlacement, type Entry, type Diary, type Asset, type TextLine } from './model';
import { prepare, release, seek, sampleAssets, type LoadedMedia } from './media';
import { pagesFor, render, dimensions, activeMedia, mediaRects, mediaForSlot, editRegions, writingStyle, prepareNotebookAssets } from './renderer';
import { loadEntries, saveEntry, pack, unpack, packNotebook, unpackNotebook, download } from './storage';
import { catalog, moods, prepareCatalog, getSticker, getMoodSticker } from './catalog';
const icons:Record<string,string>={
  book:'<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 4-6 5 7"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',play:'<path d="m8 4 12 8-12 8Z"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',check:'<path d="m5 12 4 4L19 6"/>',folder:'<path d="M3 7V4h6l3 3h9v13H3Z"/>',
  leaf:'<path d="M5 20Q2 4 20 3q0 17-14 14M5 20 16 8"/>',undo:'<path d="M7 4 2 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2"/>',
  pen:'<path d="m4 16-1 5 5-1L21 7l-4-4Z M14 6l4 4"/>',
};
const icon=(name:string)=>`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.book}</svg>`;
const esc=(v:string)=>v.replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]!));
let diary:Diary=initialDiary(),assets:Asset[]=[],media:LoadedMedia[]=[],pages:TextLine[][]=[],page=0;
let playing=false,raf=0,saveTimer:ReturnType<typeof setTimeout>,busy=false,controller:AbortController|undefined;
let entries:Entry[]=[],entryId:string=crypto.randomUUID(),reading=true,viewRatio:Diary['ratio']|undefined;
let selectedSticker='',uploadTarget:{page:number;slot:number}|undefined,customStickerUpload=false;
let initialized=false,unsaved=false,saveQueue:Promise<void>=Promise.resolve();
type WritingField='title'|'body'|'note';
let inlineEdit:{field:WritingField;start:number;end:number;prefix:string;suffix:string;value:string}|undefined;
let keyboardOpen=false,keyboardTab:'stickers'|'emoji'|'mood'='stickers',keyboardQuery='',keyboardCategory='推荐';
let commandRange:{start:number;end:number}|undefined;
let recentStickers:string[]=[];
type ReaderView={id:string;page:number;ratio?:Diary['ratio'];reading:boolean};
let savedView:ReaderView|undefined;
try{const v=JSON.parse(sessionStorage.getItem('daybook-reader-view')??'null');if(v&&typeof v.id==='string')savedView={id:v.id,page:Number.isInteger(v.page)?Math.max(0,Math.min(499,v.page)):0,ratio:v.ratio==='portrait'||v.ratio==='landscape'?v.ratio:undefined,reading:v.reading!==false};}catch{}
try{const saved=JSON.parse(localStorage.getItem('daybook-recent-stickers')??'[]');if(Array.isArray(saved))recentStickers=saved.filter((s:unknown)=>typeof s==='string').slice(0,16);}catch{}
const smallScreen=window.matchMedia('(max-width:760px)');
const displayDiary=():Diary=>({...diary,ratio:viewRatio??(smallScreen.matches?'portrait':'landscape')});
const mediaCount=()=>assets.filter(a=>a.role!=='sticker').length;
const requiredPages=()=>Math.max(1,Math.ceil(mediaCount()/slotCount(diary.layout)),...Object.keys(diary.pageSlots).map(p=>Number(p)+1),...diary.stickers.map(s=>s.page+1));
let deferredInstall:Event & {prompt?:()=>Promise<void>}|undefined;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header class="topbar"><a class="brand" href="./" aria-label="口袋日记首页"><span class="brand-mark">${icon('book')}</span><span>口袋日记<small>Pocket Diary</small></span></a>
<div class="top-caption">翻开日常，收藏心情。</div><nav aria-label="日记工具"><span id="save-state" role="status">准备好了</span><button class="quiet template-trigger" id="templates-open" aria-label="选择日记本模板" aria-expanded="false">${icon('book')}<span>模板</span></button><button class="quiet" id="calendar-open" aria-label="日历与日记">${icon('calendar')}<span>日历与日记</span></button><button class="quiet" id="new-entry" aria-label="写今天">${icon('plus')}<span>写今天</span></button><button class="quiet" id="mode-toggle" aria-label="编辑这篇">${icon('pen')}<span>编辑这篇</span></button><button class="primary" id="export-open" aria-label="导出分享">${icon('download')}<span>导出 / 分享</span></button></nav></header>
<main class="workspace reading is-loading" aria-busy="true">
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
<label class="field">今日心情<select id="mood"><option>小小的幸福</option><option>元气满满</option><option>平静自在</option><option>有点想你</option><option>需要抱抱</option><option>明天会更好</option></select></label><div class="mood-picker" id="mood-picker" aria-label="选择今日心情"></div>
</section><p class="local-note">${icon('leaf')}素材与日记保存在当前浏览器。<br>记得备份工程，就能换设备继续写。</p></aside>
<section class="studio" aria-label="日记预览与模板">
<div class="stage-toolbar"><button class="reader-date" id="reader-date">${icon('calendar')}<span></span></button><div class="segmented" aria-label="阅读方式"><button data-ratio="landscape">展开双页</button><button data-ratio="portrait">单页阅读</button></div></div>
<div class="canvas-stage"><div class="stage-stamp" id="reading-hint">点文字就能写，贴一点今天的心情。</div><div class="book-viewport"><canvas id="preview" width="1600" height="900" role="img" aria-label="日记完整书页"></canvas><div id="page-hotspots"></div><div id="sticker-selection" hidden></div><div id="page-editor-shell" hidden><textarea id="page-editor" aria-label="在书页上编辑正文" spellcheck="false"></textarea></div></div><div class="stage-bottom"><span id="theme-caption"></span><span id="page-description">完整书页，慢慢读。</span></div></div>
<div class="page-writing-tools" aria-label="书页编辑工具"><span id="inline-status">直接在书页上写</span><div><button id="emoji-toggle" class="quiet" aria-label="输入表情">☺ <span>表情</span></button><button id="stickers-toggle" class="quiet" aria-label="打开贴纸键盘">✿ <span>贴纸</span></button><button id="page-paste-sticker" class="quiet" aria-label="上传图片贴纸">${icon('image')} <span>图片贴纸</span></button><button id="inline-done" class="quiet" hidden>写好了 ✓</button></div></div>
<div class="playback"><button class="quiet" id="play">${icon('play')} 动画预览</button><div class="pagination"><button class="icon-button previous" id="prev" aria-label="前一页日记">${icon('chevron')}</button><span id="page-label">1 / 1</span><button class="icon-button" id="next" aria-label="后一页日记">${icon('chevron')}</button></div><label class="page-media editing-only">本页素材 <select id="page-media" aria-label="本页第一张素材"></select></label><span class="reading-only" id="entry-position"></span></div>
<div class="edit-tools">
<div class="template-heading"><div><h2>选一本喜欢的本子</h2><p>换一种纸张，也换一种记住今天的方式。</p></div><span>8 种心情，随时换</span></div>
<div class="templates" id="templates">${themes.map(t=>`<button class="template" data-theme="${t.id}" aria-pressed="false"><canvas data-thumb="${t.id}" width="240" height="140" aria-hidden="true"></canvas><span class="template-name">${t.name}<i>${icon('check')}</i></span><small>${t.hint}</small></button>`).join('')}</div>
<div class="layout-heading"><h2>这一页放几张照片？</h2><div class="layout-picker" aria-label="照片布局"><button data-layout="single">▧ 单张主图</button><button data-layout="duo">▥ 双图拼贴</button><button data-layout="trio">▦ 三张旅行记</button><button data-layout="wall">▦ 四格照片墙</button></div><p>每个画框都能直接点击替换，照片和视频可以混用。</p></div>
<section class="sticker-workshop"><div class="template-heading"><div><h2>把小心情，贴进日记</h2><p>搜索手绘图标、表情和插画，添加后可在书页上拖动。</p></div><button class="quiet" id="custom-sticker">上传自己的贴纸</button></div><input id="sticker-search" type="search" placeholder="搜索：花、咖啡、旅行、猫咪、开心…" aria-label="搜索贴纸"><div id="sticker-categories" class="sticker-categories"></div><div id="sticker-grid" class="sticker-grid"></div><div id="sticker-tools" hidden><label>贴纸大小 <input id="sticker-size" type="range" min="24" max="150" value="70"></label><label>旋转 <input id="sticker-rotation" type="range" min="-30" max="30" value="0"></label><button id="remove-sticker" class="quiet">移除选中贴纸</button><button id="deselect-sticker" class="text-button">完成摆放</button></div></section>
<details class="more-options"><summary>纸张装饰与播放设置</summary><div class="option-grid"><label class="field">装饰多少<select id="decoration"><option value="0">清爽</option><option value="1">适中</option><option value="2">丰富</option></select></label><label class="field">图片显示<select id="fit"><option value="cover">铺满画框</option><option value="contain">显示完整图片</option></select></label><label class="field">每页停留<select id="seconds"><option value="3">3 秒</option><option value="6">6 秒</option><option value="9">9 秒</option><option value="12">12 秒</option></select></label><label class="checkbox"><input id="original-audio" type="checkbox">保留视频原声</label></div><p class="field-hint">视频采用逐句入页动画；阅读时可按日期翻阅。自然纸页卷曲动画留待后续版本。</p></details>
</div><footer class="studio-footer"><span>日记留在你的设备里</span><div><button class="text-button" id="sample">添加示例</button><a href="https://github.com/yao2943867657-dev/daybook-studio" target="_blank" rel="noopener">GitHub 开源</a></div></footer>
</section></main>
<input id="project-input" type="file" accept=".zip" hidden>
<input id="sticker-input" type="file" accept="image/png,image/webp,image/jpeg" hidden>
<dialog id="calendar-dialog"><div class="dialog-heading"><div><h2>日子，一页页收好</h2><p id="entry-count"></p></div><button class="icon-button" data-close="calendar-dialog" aria-label="关闭日历">×</button></div><div class="calendar-nav"><button id="month-prev" class="icon-button" aria-label="上个月">‹</button><strong id="calendar-month"></strong><button id="month-next" class="icon-button" aria-label="下个月">›</button></div><div class="calendar-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="calendar-grid" id="calendar-grid"></div><div class="calendar-jump"><label>跳到某天<input type="date" id="calendar-date"></label><button class="quiet" id="calendar-today">今天</button></div><div id="entry-list"></div><div class="calendar-actions"><button class="quiet" id="calendar-write">写下这一天</button><button class="quiet" id="backup">备份这篇</button><button class="quiet" id="backup-notebook">备份整本</button><button class="quiet" id="import-project">导入日记</button><button class="text-button" id="install">安装到桌面</button></div></dialog>
<section class="sticker-keyboard" id="sticker-keyboard" role="region" aria-label="表情与贴纸键盘" hidden><div class="keyboard-heading"><div class="keyboard-tabs"><button data-keyboard-tab="stickers">贴到书页</button><button data-keyboard-tab="emoji">输入表情</button><button data-keyboard-tab="mood">今日心情</button></div><button id="keyboard-close" class="icon-button" aria-label="收起贴纸键盘">×</button></div><div class="keyboard-search"><input type="search" id="keyboard-search" aria-label="搜索表情与贴纸" placeholder="搜猫猫、抱抱、开心、花…"><button class="quiet" id="keyboard-upload" aria-label="添加自己的图片贴纸">＋ 图片</button></div><div id="keyboard-categories" class="keyboard-categories"></div><div id="keyboard-grid" class="keyboard-grid"></div><div class="keyboard-selected" id="keyboard-selected" hidden><label>大小<input id="quick-sticker-size" type="range" min="24" max="150"></label><label>旋转<input id="quick-sticker-rotation" type="range" min="-30" max="30"></label><button id="quick-sticker-remove" class="quiet">移除</button><button id="quick-sticker-done" class="quiet">摆好了</button></div><p id="keyboard-hint">点一下贴到书页，拖动到喜欢的位置。可直接粘贴图片。</p></section>
<dialog id="export-dialog"><form method="dialog"><div class="dialog-heading"><div><h2>把今天带走</h2><p>保存日记，发到小红书或朋友圈。</p></div><button class="icon-button" aria-label="关闭">×</button></div></form><div class="export-choices"><button class="export-card" id="export-png">${icon('image')}<strong>日记图片</strong><span>保存当前页 · PNG</span></button><button class="export-card" id="export-video">${icon('play')}<strong>日记视频</strong><span>这篇的全部页 · 24 帧/秒</span></button></div><div class="export-settings"><label class="field">分享画幅<select id="export-ratio"><option value="portrait">9:16 竖屏 · 小红书 / 朋友圈</option><option value="landscape">16:9 横屏 · 展开双页</option></select></label><label class="field">视频格式<select id="format"><option value="mp4">MP4（优先）</option><option value="webm">WebM（备选）</option></select></label><label class="field">清晰度<select id="size"><option value="720">720p · 更轻巧</option><option value="1080">1080p · 更清晰</option></select></label></div><p class="field-hint">保存视频后，在小红书或微信相册发布。视频最长 3 分钟，导出期间请保持页面在前台。多视频页面以第一个视频的原声为主。</p><div id="export-progress" hidden><progress max="1" value="0"></progress><p role="status" id="progress-text"></p><button class="quiet" id="cancel-export">取消导出</button></div><p id="export-error" role="alert"></p><div id="export-result" hidden><video controls playsinline aria-label="导出成片预览"></video><a class="primary" download>保存视频</a><button class="quiet" id="share-video">分享视频</button><small>系统分享不可用时，请先保存到相册，再到小红书或朋友圈发布。</small></div></dialog>
<dialog id="message-dialog"><h2 id="message-title"></h2><p id="message-body"></p><div class="dialog-actions"><button id="message-cancel" class="quiet">取消</button><button id="message-ok" class="primary">知道了</button></div></dialog>
<div id="toast" role="status" class="toast" hidden></div>
<section id="startup-state" class="startup-state" role="status" aria-live="polite"><div class="loading-notebook" aria-hidden="true"><i></i><i></i><i></i></div><h2 id="startup-title">正在翻开你的日记…</h2><p id="startup-description">照片和文字都保存在这台设备上。</p><div id="startup-actions" hidden><button class="primary" id="startup-retry">重新打开</button><button class="quiet" id="startup-import">导入备份</button></div></section>`;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const templateBrowser=document.createElement('section');templateBrowser.id='template-browser';templateBrowser.className='template-browser';templateBrowser.hidden=true;templateBrowser.setAttribute('role','region');templateBrowser.setAttribute('aria-label','日记本模板与照片布局');
templateBrowser.innerHTML='<button class="icon-button template-close" id="templates-close" aria-label="收起模板">×</button>';
for(const selector of ['.edit-tools>.template-heading','#templates','.layout-heading'])templateBrowser.append($(selector));
const templateTabs=document.createElement('div');templateTabs.className='template-tabs';templateTabs.setAttribute('aria-label','模板类型');templateTabs.innerHTML='<button data-template-tab="books" class="active" aria-pressed="true">本子样式</button><button data-template-tab="layout" aria-pressed="false">照片布局</button>';
templateBrowser.insertBefore(templateTabs,templateBrowser.querySelector('#templates'));templateBrowser.querySelector<HTMLElement>('.layout-heading')!.hidden=true;
app.append(templateBrowser);
const canvas=$<HTMLCanvasElement>('#preview');const exportDialog=$<HTMLDialogElement>('#export-dialog');
let toastTimer:ReturnType<typeof setTimeout>,resultURL='',resultBlob:Blob|undefined,resultName='';
function toast(message:string){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function message(title:string,body:string,confirm=false):Promise<boolean>{
  const dialog=$<HTMLDialogElement>('#message-dialog');$('#message-title').textContent=title;$('#message-body').textContent=body;$('#message-cancel').hidden=!confirm;$('#message-ok').textContent=confirm?'继续':'知道了';dialog.showModal();
  return new Promise(resolve=>{const end=(ok:boolean)=>{dialog.close();resolve(ok);};$('#message-ok').onclick=()=>end(true);$('#message-cancel').onclick=()=>end(false);dialog.oncancel=e=>{e.preventDefault();end(false);};});
}
function fill(){
  const moodSelect=$<HTMLSelectElement>('#mood');if(!Array.from(moodSelect.options).some(o=>o.value===diary.mood))moodSelect.add(new Option(diary.mood,diary.mood));
  for(const key of ['date','title','body','note','mood','fit','seconds','decoration'] as const) $<HTMLInputElement|HTMLSelectElement>(`#${key}`).value=String(diary[key]);
  $<HTMLInputElement>('#original-audio').checked=diary.originalAudio;
}
function stop(){playing=false;cancelAnimationFrame(raf);for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.pause();document.querySelectorAll<HTMLVideoElement>('.inline-video video').forEach(v=>v.pause());$('#page-hotspots').hidden=false;$('#play').innerHTML=`${icon('play')} 动画预览`;}
function paint(){render(canvas,displayDiary(),pages,page,media,999,false,inlineEdit?.field);updateStickerSelection();positionPageEditor();}
function refresh(thumbnails=false,rebuildHotspots=true){
  const displayed=displayDiary();if(!inlineEdit){pages=pagesFor(displayed,requiredPages());page=Math.min(page,pages.length-1);}
  const [w,h]=dimensions(displayed);canvas.width=w;canvas.height=h;canvas.classList.toggle('portrait',displayed.ratio==='portrait');$('.book-viewport').classList.toggle('portrait',displayed.ratio==='portrait');
  const chronological=[...sortEntries(entries)].reverse(),index=chronological.findIndex(e=>e.id===entryId);
  $('#page-label').textContent=`${page+1} / ${pages.length}`;$<HTMLButtonElement>('#prev').disabled=page===0&&index<=0;$<HTMLButtonElement>('#next').disabled=page===pages.length-1&&index>=chronological.length-1;
  $('#reader-date span').textContent=`${diary.date.replaceAll('-',' / ')} 的日记`;
  $('#entry-position').textContent=`${Math.max(1,index+1)} / ${Math.max(1,entries.length)} 篇`;
  $('#word-count').textContent=`${diary.body.length} 字`;
  $('#theme-caption').textContent=themes.find(t=>t.id===diary.theme)!.name;
  document.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b=>b.classList.toggle('active',b.dataset.ratio===displayed.ratio));
  document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach(b=>b.classList.toggle('active',b.dataset.layout===diary.layout));
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>{const selected=b.dataset.theme===diary.theme;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  const select=$<HTMLSelectElement>('#page-media');select.innerHTML='<option value="">按顺序自动匹配</option>'+assets.filter(a=>a.role!=='sticker').map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');select.value=diary.pageSlots[String(page)]?.[0]??diary.pageMedia[String(page)]??'';
  $('#reading-hint').textContent=reading?'翻一页，遇见那天的自己。':'点文字直接修改 · 点照片直接替换 · 拖动贴纸自由摆放';
  $('#page-description').textContent=reading?'完整书页，视频点击才播放。':'照片与视频都能放进每个画框。';
  paint();if(rebuildHotspots)buildHotspots();renderMoods();
  if(thumbnails)document.querySelectorAll<HTMLCanvasElement>('[data-thumb]').forEach(c=>{
    const layouts:Record<string,Diary['layout']>={sketch:'single',cream:'duo',travel:'trio',blue:'wall',forest:'single',film:'trio',chat:'single',pocket:'duo'};
    const td={...diary,ratio:'landscape',layout:layouts[c.dataset.thumb!],theme:c.dataset.thumb,pageSlots:{},pageMedia:{}} as Diary;render(c,td,pagesFor(td),0,media);
  });
  if(initialized)try{sessionStorage.setItem('daybook-reader-view',JSON.stringify({id:entryId,page,ratio:viewRatio,reading}));}catch{}
}
let revision=0;
async function persist(){
  clearTimeout(saveTimer);if(!initialized||!unsaved)return;
  const r=revision,e:Entry={id:entryId,diary:structuredClone(diary),assets:assets.map(a=>({...a})),updatedAt:Date.now()};
  entries=sortEntries([...entries.filter(x=>x.id!==entryId),e]);
  const job=saveQueue.catch(()=>{}).then(()=>saveEntry(e));saveQueue=job;
  try{await job;if(r===revision){unsaved=false;$('#save-state').textContent='这篇已保存在本机';}}
  catch(error){$('#save-state').textContent='保存失败，请备份';throw error;}
}
function queueSave(){unsaved=true;revision++;clearTimeout(saveTimer);$('#save-state').textContent='正在保存…';saveTimer=setTimeout(()=>{void persist().catch(error=>toast(`保存失败：${(error as Error).message}。请备份日记后再继续。`));},450);}
function changed(thumbnails=false){stop();queueSave();refresh(thumbnails);}
function assetList(){
  $('#asset-count').textContent=`${mediaCount()} / 20`;
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
      if(assets.filter(a=>a.role!=='sticker').length>=20&&!uploadTarget&&!customStickerUpload){toast('每篇最多放入 20 份照片 / 视频');break;}
      if(customStickerUpload&&assets.filter(a=>a.role==='sticker').length>=100){toast('每篇最多上传 100 张自定义贴纸');break;}
      if(file.size>200*1024*1024) {toast(`“${file.name}”超过 200 MB，请先压缩`);continue;}
      if(!/^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(file.type)){toast(`暂不支持“${file.name}”，请转成 JPG、PNG 或 MP4`);continue;}
      const a:Asset={id:crypto.randomUUID(),name:file.name,type:file.type.startsWith('video')?'video':'image',blob:file,...(customStickerUpload?{role:'sticker' as const}:{})};
      try{
        const m=await prepare(a);
        if(customStickerUpload){assets.push(a);media.push(m);addSticker(`asset:${a.id}`);}
        else if(uploadTarget){
          const prior=mediaForSlot(diary,uploadTarget.page,uploadTarget.slot,media);
          const resolved=Object.fromEntries(Array.from({length:pages.length},(_,p)=>[String(p),Array.from({length:slotCount(diary.layout)},(_,s)=>mediaForSlot(diary,p,s,media)?.asset.id??'__empty__')]));
          resolved[String(uploadTarget.page)][uploadTarget.slot]=a.id;
          const stillUsed=!!prior&&(Object.values(resolved).some(ids=>ids.includes(prior.asset.id))||diary.stickers.some(s=>s.kind===`asset:${prior.asset.id}`));
          if(mediaCount()>=20&&(!prior||stillUsed)){release([m]);throw new Error('这篇已有 20 份素材，请先移除一份再替换这个位置');}
          assets.push(a);media.push(m);diary.pageSlots=resolved;diary.pageMedia={};
          if(prior&&!stillUsed){const idx=assets.findIndex(a=>a.id===prior.asset.id);release([media[idx]]);assets.splice(idx,1);media.splice(idx,1);}
        }else{
          if(assets.length&&assets.every(a=>a.id.startsWith('sample-'))){release(media);assets=[];media=[];diary.pageMedia={};diary.pageSlots={};}
          if(Object.keys(diary.pageSlots).length){
            const resolved=Object.fromEntries(Array.from({length:pages.length},(_,p)=>[String(p),Array.from({length:slotCount(diary.layout)},(_,s)=>mediaForSlot(diary,p,s,media)?.asset.id??'__empty__')]));
            let placed=false;for(const ids of Object.values(resolved)){const empty=ids.indexOf('__empty__');if(empty>=0){ids[empty]=a.id;placed=true;break;}}
            if(!placed)resolved[String(pages.length)]=[a.id,...Array(Math.max(0,slotCount(diary.layout)-1)).fill('__empty__')];diary.pageSlots=resolved;
          }
          assets.push(a);media.push(m);
        }
        accepted++;
      }catch(e){toast((e as Error).message);}
    }
    if(accepted){if(!uploadTarget&&!customStickerUpload&&diary.layout==='single'&&mediaCount()>1)diary.layout=mediaCount()===2?'duo':mediaCount()===3?'trio':'wall';assetList();changed(true);toast(uploadTarget?'这个位置的照片 / 视频已更换':`已添加 ${accepted} 份素材`);}
  }finally{busy=false;$('.workspace').inert=false;$('.topbar').inert=false;$('#dropzone').classList.remove('loading');$<HTMLInputElement>('#media-input').value='';uploadTarget=undefined;customStickerUpload=false;}
}
for(const key of ['date','title','body','note','mood','fit','seconds','decoration'] as const){
  $(`#${key}`).addEventListener('input',()=>{if(busy)return;const value=$<HTMLInputElement|HTMLSelectElement>(`#${key}`).value;(diary as unknown as Record<string,unknown>)[key]=['seconds','decoration'].includes(key)?Number(value):value;changed(key==='fit'||key==='decoration');});
}
$('#original-audio').onchange=()=>{diary.originalAudio=$<HTMLInputElement>('#original-audio').checked;changed();};
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.onclick=()=>{if(busy)return;finishInlineEdit();diary.theme=b.dataset.theme as Diary['theme'];if(diary.theme==='pocket')diary.ratio='portrait';changed();closeTemplates();toast(`已换成${themes.find(t=>t.id===diary.theme)!.name}，文字和照片已保留`);});
function closeTemplates(){templateBrowser.hidden=true;$('#templates-open').setAttribute('aria-expanded','false');}
$('#templates-open').onclick=()=>{if(busy)return;if(!templateBrowser.hidden){closeTemplates();return;}finishInlineEdit();closeKeyboard();refresh(true);templateBrowser.hidden=false;$('#templates-open').setAttribute('aria-expanded','true');};
$('#templates-close').onclick=closeTemplates;
templateTabs.onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-template-tab]');if(!b)return;const layout=b.dataset.templateTab==='layout';$('#templates').hidden=layout;$('.layout-heading').hidden=!layout;templateTabs.querySelectorAll('button').forEach(button=>{const selected=button===b;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});};
document.addEventListener('pointerdown',e=>{if(!templateBrowser.hidden&&e.target instanceof Element&&!e.target.closest('#template-browser,#templates-open'))closeTemplates();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!templateBrowser.hidden){closeTemplates();$('#templates-open').focus({preventScroll:true});}});
document.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach(b=>b.onclick=()=>{if(busy)return;finishInlineEdit();viewRatio=b.dataset.ratio as Diary['ratio'];stop();refresh();});
document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach(b=>b.onclick=()=>{if(busy)return;diary.layout=b.dataset.layout as Diary['layout'];diary.pageSlots={};diary.pageMedia={};const count=pagesFor(displayDiary(),Math.max(1,Math.ceil(mediaCount()/slotCount(diary.layout)))).length;for(const s of diary.stickers)s.page=Math.min(s.page,count-1);selectedSticker='';changed(true);closeTemplates();});
$('#page-media').onchange=()=>{const ids=diary.pageSlots[String(page)]??[];ids[0]=$<HTMLSelectElement>('#page-media').value;diary.pageSlots[String(page)]=ids;delete diary.pageMedia[String(page)];changed();};
$('#prev').onclick=()=>void turn(-1);$('#next').onclick=()=>void turn(1);
$('#assets').onclick=e=>{
  if(busy)return;const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
  if(b.dataset.remove!==undefined){stop();const i=Number(b.dataset.remove);const id=assets[i].id;release([media[i]]);media.splice(i,1);assets.splice(i,1);for(const key of Object.keys(diary.pageMedia))if(diary.pageMedia[key]===id)delete diary.pageMedia[key];for(const ids of Object.values(diary.pageSlots))for(let j=0;j<ids.length;j++)if(ids[j]===id)ids[j]='';diary.stickers=diary.stickers.filter(s=>s.kind!==`asset:${id}`);}
  if(b.dataset.move!==undefined){const i=Number(b.dataset.move);if(i>0){[assets[i-1],assets[i]]=[assets[i],assets[i-1]];[media[i-1],media[i]]=[media[i],media[i-1]];diary.pageSlots={};diary.pageMedia={};}}
  assetList();changed(true);
};
$<HTMLInputElement>('#media-input').onchange=e=>void addFiles(Array.from((e.target as HTMLInputElement).files??[]));
$('#dropzone').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();uploadTarget=undefined;customStickerUpload=false;$<HTMLInputElement>('#media-input').multiple=true;$<HTMLInputElement>('#media-input').click();}};
$('#dropzone').ondragover=e=>{e.preventDefault();$('#dropzone').classList.add('dragging');};$('#dropzone').ondragleave=()=>$('#dropzone').classList.remove('dragging');
$('#dropzone').ondrop=e=>{e.preventDefault();$('#dropzone').classList.remove('dragging');void addFiles(Array.from(e.dataTransfer?.files??[]));};
$('#play').onclick=async()=>{
  finishInlineEdit();closeKeyboard();
  if(playing){stop();refresh();return;}stop();playing=true;$('#play').innerHTML='Ⅱ 暂停预览';
  const start=performance.now(),startPage=page;let oldPage=-1;
  const tick=()=>{
    if(!playing)return;const elapsed=(performance.now()-start)/1000;
    const p=startPage+Math.floor(elapsed/diary.seconds);if(p>=pages.length){stop();refresh();return;}
    if(p!==oldPage){for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.pause();page=p;refresh();oldPage=p;
      const selected=[...new Set(Array.from({length:slotCount(diary.layout)},(_,slot)=>mediaForSlot(diary,p,slot,media)))];let hasSound=false;
      for(const m of selected)if(m?.element instanceof HTMLVideoElement){m.element.currentTime=0;m.element.muted=!diary.originalAudio||hasSound;hasSound=true;void m.element.play().catch(()=>toast('视频未能自动播放，请重新点击播放'));}
      $('#page-hotspots').hidden=true;
    }
    render(canvas,displayDiary(),pages,p,media,elapsed%diary.seconds,true);raf=requestAnimationFrame(tick);
  };tick();
};
async function openEntry(e:Entry,lastPage=false){
  if(busy)return;finishInlineEdit();closeKeyboard();busy=true;stop();$('.workspace').inert=true;$('.topbar').inert=true;
  try{await persist();e=entries.find(x=>x.id===e.id)??e;const prepared:LoadedMedia[]=[];try{for(const a of e.assets)prepared.push(await prepare({...a}));}catch(error){release(prepared);throw error;}
    release(media);diary=structuredClone(e.diary);assets=e.assets.map(a=>({...a}));media=prepared;entryId=e.id;page=0;selectedSticker='';unsaved=false;fill();assetList();refresh(true);
    if(lastPage){page=pages.length-1;refresh();}$('#save-state').textContent='已打开这天的日记';
    await saveEntry({...e,diary:structuredClone(e.diary)});
  }catch(error){toast(`未能打开日记：${(error as Error).message}。当前内容仍保留。`);}finally{busy=false;$('.workspace').inert=false;$('.topbar').inert=false;}
}
async function createEntry(date=localDate(),sample=false){
  if(busy)return;finishInlineEdit();closeKeyboard();busy=true;$('.workspace').inert=true;$('.topbar').inert=true;try{await persist();const d=initialDiary();d.date=date;
    if(!sample){d.title='';d.body='';d.note='';d.stickers=[];d.layout='single';d.theme=diary.theme;d.decoration=2;}
    const a=sample?sampleAssets():[];const prepared:LoadedMedia[]=[];try{for(const asset of a)prepared.push(await prepare(asset));}catch(error){release(prepared);throw error;}
    stop();release(media);diary=d;assets=a;media=prepared;entryId=crypto.randomUUID();page=0;selectedSticker='';fill();assetList();setMode(false);changed(true);await persist();
  }catch(error){toast(`未能创建日记：${(error as Error).message}`);}finally{busy=false;$('.workspace').inert=false;$('.topbar').inert=false;}
}
$('#new-diary').onclick=()=>void createEntry();
$('#new-entry').onclick=async()=>{const today=sortEntries(entries).find(e=>e.diary.date===localDate());if(today){await openEntry(today);setMode(false);}else await createEntry();};
$('#sample').onclick=()=>void createEntry(localDate(),true);
$('#backup').onclick=async()=>{if(busy)return;try{await persist();toast('正在打包这篇日记…');download(await pack(diary,assets),`口袋日记-${diary.date}.zip`);toast('这篇日记已备份，包含文字与原始素材');}catch(e){toast((e as Error).message);}};
$('#backup-notebook').onclick=async()=>{if(busy)return;busy=true;try{await persist();toast('正在打包整本日记…');download(await packNotebook(entries),`口袋日记-整本日记-${localDate()}.zip`);toast('整本日记备份已准备好');}catch(e){toast((e as Error).message);}finally{busy=false;}};
$('#import-project').onclick=()=>$<HTMLInputElement>('#project-input').click();
$<HTMLInputElement>('#project-input').onchange=async e=>{
  const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
  busy=true;try{await persist();let imported:Entry[];
    imported=await unpackNotebook(file);
    const known=new Set(entries.map(e=>e.id));let firstImported:string|undefined;
    for(const raw of imported){const entry={...raw,id:known.has(raw.id)?crypto.randomUUID():raw.id};await saveEntry(entry);entries.push(entry);known.add(entry.id);firstImported??=entry.id;}
    entries=sortEntries(entries);busy=false;$<HTMLDialogElement>('#calendar-dialog').close();if(firstImported){const last=entries.find(e=>e.id===firstImported)!;await openEntry(last);}
    if(!initialized)completeStartup();toast(`已导入 ${imported.length} 篇日记，原有记录保留`);
  }catch(e){toast((e as Error).message);}finally{busy=false;(e.target as HTMLInputElement).value='';}
};
$('#export-open').onclick=()=>{finishInlineEdit();closeKeyboard();stop();refresh();$('#export-error').textContent='';$<HTMLSelectElement>('#export-ratio').value=displayDiary().ratio;exportDialog.showModal();};
$('#export-png').onclick=async()=>{
  const output=document.createElement('canvas');const d={...diary,ratio:$<HTMLSelectElement>('#export-ratio').value as Diary['ratio']};const [w,h]=dimensions(d);output.width=w;output.height=h;const pp=pagesFor(d,requiredPages());render(output,d,pp,Math.min(page,pp.length-1),media);
  output.toBlob(blob=>{if(blob){download(blob,`口袋日记-${diary.date}-${page+1}.png`);toast('日记图片已准备好');}else $('#export-error').textContent='图片导出失败，请重试';},'image/png');
};
$('#export-video').onclick=async()=>{
  if(busy)return;busy=true;stop();controller=new AbortController();$('#export-error').textContent='';$('#export-progress').hidden=false;$('#export-result').hidden=true;
  $<HTMLButtonElement>('#export-video').disabled=true;$<HTMLButtonElement>('#export-png').disabled=true;
  $('.workspace').inert=true;$('.topbar').inert=true;
  try{
    for(const m of media)if(m.element instanceof HTMLVideoElement)m.element.muted=true;
    const { exportVideo }=await import('./exporter');const format=$<HTMLSelectElement>('#format').value as 'mp4'|'webm';
    $<HTMLVideoElement>('#export-result video').pause();
    const exported={...structuredClone(diary),ratio:$<HTMLSelectElement>('#export-ratio').value as Diary['ratio']};
    const exportPages=pagesFor(exported,requiredPages());
    const blob=await exportVideo(exported,exportPages,media,{format,size:Number($<HTMLSelectElement>('#size').value),signal:controller.signal,progress:(v,msg)=>{$<HTMLProgressElement>('progress').value=v;$('#progress-text').textContent=`${msg} · ${Math.round(v*100)}%`;}});
    if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(blob);
    resultBlob=blob;resultName=`口袋日记-${diary.date}.${format}`;
    $<HTMLVideoElement>('#export-result video').src=resultURL;const a=$<HTMLAnchorElement>('#export-result a');a.href=resultURL;a.download=resultName;$('#export-result').hidden=false;
    $('#progress-text').textContent=`视频生成完成 · ${(blob.size/1024/1024).toFixed(1)} MB`;
  }catch(e){$('#export-error').textContent=(e as Error).name==='AbortError'?'已取消导出，日记仍保留。':(e as Error).message;}
  finally{busy=false;controller=undefined;$('.workspace').inert=false;$('.topbar').inert=false;$<HTMLButtonElement>('#export-video').disabled=false;$<HTMLButtonElement>('#export-png').disabled=false;$('#export-progress').hidden=true;refresh();}
};
$('#cancel-export').onclick=()=>controller?.abort();
exportDialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});exportDialog.querySelector('form')!.addEventListener('submit',e=>{if(busy)e.preventDefault();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
$('#install').onclick=async()=>{if(deferredInstall?.prompt)await deferredInstall.prompt();else await message('把口袋日记放到桌面','电脑：在 Chrome / Edge 菜单中选择“安装此应用”。iPhone：用 Safari 打开 HTTPS 地址，点分享 → 添加到主屏幕。Android：在浏览器菜单中选择安装或添加到主屏幕。离线使用前请先联网打开一次。');};
window.addEventListener('beforeunload',e=>{if(busy)controller?.abort();if(unsaved){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&unsaved)void persist().catch(()=>{});});

function setMode(read:boolean){
  finishInlineEdit();closeKeyboard();
  reading=read;stop();if(read)selectedSticker='';$('.workspace').classList.toggle('reading',read);
  $('#mode-toggle').innerHTML=`${icon(read?'pen':'book')}<span>${read?'编辑这篇':'完成 · 阅读'}</span>`;
  $('#mode-toggle').setAttribute('aria-label',read?'编辑这篇':'完成并阅读');
  refresh();
}
$('#mode-toggle').onclick=()=>setMode(!reading);
smallScreen.addEventListener('change',()=>{finishInlineEdit();stop();refresh();});
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=()=>$<HTMLDialogElement>(`#${b.dataset.close}`).close());

async function turn(direction:-1|1){
  if(busy)return;finishInlineEdit();closeKeyboard();stop();selectedSticker='';
  const old=document.createElement('canvas');old.width=canvas.width/2;old.height=canvas.height;
  old.getContext('2d')!.drawImage(canvas,direction===1?canvas.width/2:0,0,canvas.width/2,canvas.height,0,0,old.width,old.height);
  const all=[...sortEntries(entries)].reverse(),index=all.findIndex(e=>e.id===entryId);
  if(direction===-1&&page>0){page--;refresh();}
  else if(direction===1&&page<pages.length-1){page++;refresh();}
  else {const e=all[index+direction];if(!e)return;await openEntry(e,direction===-1);}
  if(displayDiary().ratio==='landscape'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    old.className=`turn-sheet ${direction===-1?'back':''}`;$('.book-viewport').append(old);
    const anim=old.animate([{transform:'rotateY(0deg)',opacity:1},{transform:`rotateY(${direction===1?-145:145}deg)`,opacity:.12}],{duration:480,easing:'cubic-bezier(.3,.05,.2,1)'});anim.onfinish=()=>old.remove();
  }
}
let calendarDate=localDate(),calendarYear=Number(calendarDate.slice(0,4)),calendarMonth=Number(calendarDate.slice(5,7))-1;
function renderCalendar(){
  $('#entry-count').textContent=`已经收藏 ${entries.length} 篇日记。有圆点的日子，藏着你的故事。`;
  $('#calendar-month').textContent=`${calendarYear} 年 ${calendarMonth+1} 月`;
  $<HTMLInputElement>('#calendar-date').value=calendarDate;
  $('#calendar-grid').innerHTML=calendarCells(calendarYear,calendarMonth).map(date=>{
    if(!date)return '<span></span>';const count=entries.filter(e=>e.diary.date===date).length;
    return `<button data-day="${date}" class="${count?'has-entry ':''}${date===calendarDate?'chosen ':''}${date===localDate()?'today':''}" aria-label="${date}${count?`，${count} 篇日记`:'，未记录'}"><span>${Number(date.slice(-2))}</span>${count?'<i></i>':''}</button>`;
  }).join('');
  const dayEntries=sortEntries(entries).filter(e=>e.diary.date===calendarDate);
  $('#entry-list').innerHTML=dayEntries.length?dayEntries.map(e=>`<button class="entry-card" data-entry="${esc(e.id)}"><span>${esc(e.diary.date)}</span><strong>${esc(e.diary.title||'没有标题的一天')}</strong><small>${esc(e.diary.mood)} · ${e.diary.body.length} 字</small></button>`).join(''):'<p class="empty-day">这天还没有日记，可以从一句话开始。</p>';
}
async function openCalendar(){if(busy)return;stop();try{await persist();}catch(error){toast((error as Error).message);return;}calendarDate=diary.date||localDate();calendarYear=Number(calendarDate.slice(0,4));calendarMonth=Number(calendarDate.slice(5,7))-1;renderCalendar();$<HTMLDialogElement>('#calendar-dialog').showModal();}
$('#calendar-open').onclick=openCalendar;$('#reader-date').onclick=openCalendar;
$('#month-prev').onclick=()=>{calendarMonth--;if(calendarMonth<0){calendarYear--;calendarMonth=11;}renderCalendar();};
$('#month-next').onclick=()=>{calendarMonth++;if(calendarMonth>11){calendarYear++;calendarMonth=0;}renderCalendar();};
$('#calendar-grid').onclick=async e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-day]');if(!b||busy)return;calendarDate=b.dataset.day!;renderCalendar();const match=sortEntries(entries).filter(e=>e.diary.date===calendarDate);if(match.length===1){$<HTMLDialogElement>('#calendar-dialog').close();await openEntry(match[0]);setMode(true);}};
$('#entry-list').onclick=async e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-entry]');const entry=entries.find(x=>x.id===b?.dataset.entry);if(!entry||busy)return;$<HTMLDialogElement>('#calendar-dialog').close();await openEntry(entry);setMode(true);};
$('#calendar-date').onchange=()=>{const date=$<HTMLInputElement>('#calendar-date').value;if(!date){$<HTMLInputElement>('#calendar-date').value=calendarDate;return;}calendarDate=date;calendarYear=Number(calendarDate.slice(0,4));calendarMonth=Number(calendarDate.slice(5,7))-1;renderCalendar();};
$('#calendar-today').onclick=()=>{calendarDate=localDate();calendarYear=Number(calendarDate.slice(0,4));calendarMonth=Number(calendarDate.slice(5,7))-1;renderCalendar();};
$('#calendar-write').onclick=async()=>{if(busy)return;$<HTMLDialogElement>('#calendar-dialog').close();await createEntry(calendarDate);};

const fieldNames={title:'日记标题',body:'今天的日记',note:'我的小批注',mood:'今日心情'};
function positionPageEditor(){
  if(!inlineEdit)return;const d=displayDiary(),r=editRegions(d).find(r=>r.kind===inlineEdit!.field)!;
  document.querySelectorAll<HTMLButtonElement>('[data-field]').forEach(b=>b.classList.toggle('active-field',b.dataset.field===inlineEdit?.field));
  const [W,H]=dimensions(d),bounds=canvas.getBoundingClientRect(),scale=bounds.width/W;
  $('#page-editor-shell').style.cssText=hotspotStyle(r,W,H);
  const input=$<HTMLTextAreaElement>('#page-editor');
  const base=inlineEdit.field==='title'?(d.ratio==='portrait'?43:37):inlineEdit.field==='note'?(d.ratio==='portrait'?26:23):writingStyle(d).bodyFontSize;
  input.style.fontFamily=writingStyle(d).fontFamily;input.style.fontSize=`${Math.max(smallScreen.matches?16:12,base*scale)}px`;
  input.style.lineHeight=String(inlineEdit.field==='body'?writingStyle(d).bodyLineHeight/writingStyle(d).bodyFontSize:1.5);input.style.color=writingStyle(d).ink;
  input.style.paddingTop=inlineEdit.field==='note'?`${27*scale}px`:'0px';
}
function finishInlineEdit(rebuild=true){if(!inlineEdit)return;inlineEdit=undefined;commandRange=undefined;$('#page-editor-shell').hidden=true;$('.book-viewport').classList.remove('is-writing');$('#inline-done').hidden=true;$('#inline-status').textContent='直接在书页上写';fill();refresh(false,rebuild);void persist().catch(error=>toast(`保存失败：${(error as Error).message}。请备份日记。`));}
function beginInlineEdit(field:WritingField|'mood'){
  if(busy)return;if(field==='mood'){finishInlineEdit();openKeyboard('mood');return;}
  if(inlineEdit?.field===field){$('#page-editor').focus();return;}
  finishInlineEdit();stop();const range=field==='body'?bodyPageRange(diary.body,pages,page):{start:0,end:diary[field].length,text:diary[field]};
  inlineEdit={field,start:range.start,end:range.end,prefix:field==='body'?diary.body.slice(0,range.start):'',suffix:field==='body'?diary.body.slice(range.end):'',value:range.text};
  const input=$<HTMLTextAreaElement>('#page-editor');input.value=range.text;input.maxLength=field==='title'?60:field==='note'?120:10000-inlineEdit.prefix.length-inlineEdit.suffix.length;
  input.setAttribute('aria-label',`在书页上编辑${fieldNames[field]}`);input.placeholder=field==='body'?'今天有什么值得记住的小事？':'写在这里…';
  $('#page-editor-shell').hidden=false;$('.book-viewport').classList.add('is-writing');$('#inline-done').hidden=false;$('#inline-status').textContent=field==='body'?`正在写第 ${page+1} 页 · 自动保存`:'直接修改 · 自动保存';
  paint();input.focus({preventScroll:true});input.setSelectionRange(field==='body'?0:input.value.length,field==='body'?0:input.value.length);
}
function applyInlineValue(){
  if(!inlineEdit)return;const input=$<HTMLTextAreaElement>('#page-editor'),s=inlineEdit;
  try{if(s.field==='body')diary.body=replaceBodyRange(s.prefix+s.value+s.suffix,s.prefix.length,s.prefix.length+s.value.length,input.value);else{if(input.value.length>input.maxLength)throw new Error(`这段文字最多 ${input.maxLength} 字`);diary[s.field]=input.value;}s.value=input.value;}
  catch(error){input.value=s.value;toast((error as Error).message);return;}
  $<HTMLInputElement|HTMLTextAreaElement>(`#${s.field}`).value=diary[s.field];$('#word-count').textContent=`${diary.body.length} 字`;queueSave();
}
$('#page-editor').oninput=e=>{
  applyInlineValue();if((e as InputEvent).isComposing)return;const input=$<HTMLTextAreaElement>('#page-editor');
  const before=input.value.slice(0,input.selectionStart),match=/(?:^|\s)(\/(?:贴纸|sticker)(?: +([^\n/]{0,20}))?)$/u.exec(before);
  if(match){commandRange={start:before.length-match[1].length,end:before.length};openKeyboard('stickers',match[2]??'',false);}else commandRange=undefined;
};
$('#page-editor').addEventListener('compositionend',()=>applyInlineValue());
$('#page-editor').onkeydown=e=>{if(e.isComposing)return;if(e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key==='Enter')){e.preventDefault();finishInlineEdit();}if((e.ctrlKey||e.metaKey)&&e.key===';'){e.preventDefault();openKeyboard('stickers');}};
$('#inline-done').onclick=()=>finishInlineEdit();
new ResizeObserver(()=>positionPageEditor()).observe(canvas);
document.addEventListener('pointerdown',e=>{
  if(!inlineEdit||!(e.target instanceof Element))return;
  if(e.target.closest('#page-editor-shell,.page-writing-tools,.sticker-keyboard,[data-field]'))return;
  // Keep the clicked node alive until its click handler has run (video/upload/toolbar).
  finishInlineEdit(false);
},true);

const emojiGroups:Record<string,string[]>={
  '心情':['🥰','🥹','😆','😊','😍','😘','🤗','🥺','😭','😤','😴','🫠','🫶','💪','✌️','🙌','🧡','💛','💚','💙','💜','🩷','🤍','💖','✨','💫','⭐','🌈'],
  '小动物':['🐱','🐶','🐰','🐻','🐼','🐹','🦊','🐣','🐥','🐸','🦋','🐾','🦦','🦭','🪿','🐈','🐕','🧸'],
  '生活':['🌷','🌸','🌼','🌻','🍀','🌿','🍃','☀️','☁️','🌙','☕','🍵','🥐','🍞','🍓','🍒','🍰','🍮','🍦','📖','✏️','🎨','🎧','📷','🎬','🎀','💌','🕯️'],
};
function openKeyboard(tab:typeof keyboardTab='stickers',query='',focus=true){
  if(busy)return;keyboardTab=tab;keyboardOpen=true;keyboardQuery=query;keyboardCategory='推荐';$('#sticker-keyboard').hidden=false;
  $<HTMLInputElement>('#keyboard-search').value=query;renderKeyboard();buildHotspots();if(focus)$<HTMLInputElement>('#keyboard-search').focus({preventScroll:true});
}
function closeKeyboard(){keyboardOpen=false;$('#sticker-keyboard').hidden=true;commandRange=undefined;selectedSticker='';updateStickerSelection();buildHotspots();}
function renderKeyboard(){
  document.querySelectorAll<HTMLButtonElement>('[data-keyboard-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.keyboardTab===keyboardTab);b.setAttribute('aria-pressed',String(b.dataset.keyboardTab===keyboardTab));});
  const categories=keyboardTab==='emoji'?Object.keys(emojiGroups):keyboardTab==='mood'?[]:['推荐','最近',...new Set(catalog.map(s=>s.category)),'我的贴纸'];
  if(!categories.includes(keyboardCategory))keyboardCategory=categories[0]??'';
  $('#keyboard-categories').innerHTML=categories.map(c=>`<button data-keyboard-category="${esc(c)}" class="${c===keyboardCategory?'active':''}">${esc(c)}</button>`).join('');
  const q=keyboardQuery.toLowerCase(),grid=$('#keyboard-grid');grid.classList.toggle('emoji-grid',keyboardTab==='emoji');
  if(keyboardTab==='mood')grid.innerHTML=moods.map(m=>`<button data-keyboard-mood="${esc(m.name)}" aria-label="心情：${esc(m.name)}">${getSticker(m.sticker)?.svg??''}<span>${esc(m.name)}</span></button>`).join('');
  else if(keyboardTab==='emoji')grid.innerHTML=(emojiGroups[keyboardCategory]??Object.values(emojiGroups).flat()).map(e=>`<button data-emoji="${e}" aria-label="输入 ${e}">${e}</button>`).join('');
  else{
    const source=q?catalog:keyboardCategory==='最近'?recentStickers.map(id=>catalog.find(s=>s.id===id)).filter((s):s is typeof catalog[number]=>!!s):keyboardCategory==='推荐'?[...catalog.filter(s=>s.category==='聊天'),...catalog.filter(s=>s.category==='心情'),...catalog.filter(s=>s.category!=='聊天'&&s.category!=='心情')]:catalog.filter(s=>s.category===keyboardCategory);
    const items=source.filter(s=>!q||[s.name,...s.tags].some(t=>t.toLowerCase().includes(q)));
    const custom=media.filter(m=>m.asset.role==='sticker'&&(!!q||keyboardCategory==='我的贴纸'||keyboardCategory==='最近'||keyboardCategory==='推荐')&&(!q||m.asset.name.toLowerCase().includes(q)));
    grid.innerHTML=items.map(s=>`<button data-keyboard-sticker="${esc(s.id)}" aria-label="贴上${esc(s.name)}">${s.svg}<span>${esc(s.name)}</span></button>`).join('')+custom.map(m=>`<button data-keyboard-sticker="asset:${esc(m.asset.id)}" aria-label="贴上${esc(m.asset.name)}"><img src="${esc(m.url)}" alt=""><span>${esc(m.asset.name)}</span></button>`).join('');
  }
  if(!grid.innerHTML)grid.innerHTML='<p class="keyboard-empty">这里还没有贴纸，试试搜索或上传自己的图片。</p>';
  $('#keyboard-search').hidden=keyboardTab==='emoji';$('#keyboard-upload').hidden=keyboardTab!=='stickers';
  $('#keyboard-hint').textContent=keyboardTab==='emoji'?'表情会输入光标所在的位置，和文字一起保存。':keyboardTab==='mood'?'点选一种表情，记住此刻的心情。':'点击贴到书页，再拖动摆放。输入 /贴纸 或按 Ctrl/⌘ + ; 也能打开。';
  updateStickerSelection();
}
function consumeStickerCommand(){
  if(!commandRange||!inlineEdit)return;const input=$<HTMLTextAreaElement>('#page-editor');input.setRangeText('',commandRange.start,commandRange.end,'end');commandRange=undefined;applyInlineValue();
}
$('#keyboard-grid').onpointerdown=e=>{if((e.target as HTMLElement).closest('button'))e.preventDefault();};
$('#keyboard-grid').onclick=e=>{
  const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||busy)return;
  if(b.dataset.keyboardSticker){consumeStickerCommand();addSticker(b.dataset.keyboardSticker);recentStickers=[b.dataset.keyboardSticker,...recentStickers.filter(id=>id!==b.dataset.keyboardSticker)].slice(0,16);try{localStorage.setItem('daybook-recent-stickers',JSON.stringify(recentStickers));}catch{}updateStickerSelection();}
  else if(b.dataset.emoji){if(!inlineEdit)beginInlineEdit('body');const input=$<HTMLTextAreaElement>('#page-editor');input.setRangeText(b.dataset.emoji,input.selectionStart,input.selectionEnd,'end');applyInlineValue();input.focus({preventScroll:true});}
  else if(b.dataset.keyboardMood){diary.mood=b.dataset.keyboardMood;fill();changed();closeKeyboard();}
};
$('#keyboard-categories').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-keyboard-category]');if(b){keyboardCategory=b.dataset.keyboardCategory!;renderKeyboard();}};
document.querySelectorAll<HTMLButtonElement>('[data-keyboard-tab]').forEach(b=>b.onclick=()=>{keyboardTab=b.dataset.keyboardTab as typeof keyboardTab;keyboardCategory='推荐';keyboardQuery='';$<HTMLInputElement>('#keyboard-search').value='';renderKeyboard();});
$('#keyboard-search').oninput=()=>{keyboardQuery=$<HTMLInputElement>('#keyboard-search').value;renderKeyboard();};
$('#keyboard-close').onclick=closeKeyboard;
$('#keyboard-search').onkeydown=e=>{if(e.key==='Escape'){closeKeyboard();(inlineEdit?$('#page-editor'):$('#stickers-toggle')).focus({preventScroll:true});}};
$('#stickers-toggle').onclick=()=>keyboardOpen&&keyboardTab==='stickers'?closeKeyboard():openKeyboard('stickers');
$('#emoji-toggle').onclick=()=>{if(!inlineEdit)beginInlineEdit('body');openKeyboard('emoji');};
$('#page-paste-sticker').onclick=$('#keyboard-upload').onclick=()=>{$<HTMLInputElement>('#sticker-input').click();};
for(const [selector,key] of [['#quick-sticker-size','size'],['#quick-sticker-rotation','rotation']] as const){
  $(selector).oninput=()=>{const s=diary.stickers.find(s=>s.id===selectedSticker);if(s){const value=Number($<HTMLInputElement>(selector).value);s[key]=key==='rotation'?value*Math.PI/180:value;paint();}};$(selector).onchange=()=>changed();
}
$('#quick-sticker-remove').onclick=()=>{diary.stickers=diary.stickers.filter(s=>s.id!==selectedSticker);selectedSticker='';changed();};
$('#quick-sticker-done').onclick=()=>{selectedSticker='';refresh();};
document.addEventListener('paste',e=>{
  if(busy||document.querySelector('dialog[open]')||!(inlineEdit||keyboardOpen))return;
  const files=Array.from(e.clipboardData?.files??[]).filter(f=>/^image\/(png|jpeg|webp|gif)$/.test(f.type));
  if(files.length){e.preventDefault();customStickerUpload=true;void addFiles(files).then(()=>{renderKeyboard();renderStickerLibrary();});}
});
function hotspotStyle(r:{x:number;y:number;w:number;h:number;rotation?:number},W:number,H:number){return `left:${r.x/W*100}%;top:${r.y/H*100}%;width:${r.w/W*100}%;height:${r.h/H*100}%;transform:rotate(${r.rotation??0}rad)`;}
function buildHotspots(){
  const host=$('#page-hotspots');host.querySelectorAll('video').forEach(v=>v.pause());
  const d=displayDiary(),[W,H]=dimensions(d);
  host.innerHTML=editRegions(d).map(r=>`<button class="field-hotspot ${r.kind===inlineEdit?.field?'active-field':''}" data-field="${r.kind}" style="${hotspotStyle(r,W,H)}" aria-label="点击修改${fieldNames[r.kind]}"><span>${icon('pen')} 修改${fieldNames[r.kind]}</span></button>`).join('')+
    mediaRects(d).map((r,slot)=>{
      const m=mediaForSlot(d,page,slot,media),label=`第 ${slot+1} 个照片或视频位置`;
      return m?.asset.type==='video'?`<div class="inline-video" style="${hotspotStyle(r,W,H)}"><video src="${esc(m.url)}" controls playsinline preload="metadata" aria-label="播放${label}" style="object-fit:${d.fit}"></video><button class="video-start" data-play-slot="${slot}" aria-label="播放第 ${slot+1} 个视频">${icon('play')}<span>点击播放</span></button><button class="replace-media" data-slot="${slot}" aria-label="更换${label}">${icon('image')}<span>更换</span></button></div>`:
        `<button class="media-hotspot ${m?'filled':''}" data-slot="${slot}" style="${hotspotStyle(r,W,H)}" aria-label="${m?'更换':'上传'}${label}"><span>${icon(m?'image':'plus')} ${m?'更换照片 / 视频':'添加照片 / 视频'}</span></button>`;
    }).join('')+(!reading||keyboardOpen||selectedSticker?diary.stickers.filter(s=>s.page===page).map(s=>`<button class="placed-sticker ${s.id===selectedSticker?'selected':''}" data-placed-sticker="${esc(s.id)}" style="left:${stickerPosition(s,d.ratio).x*100}%;top:${stickerPosition(s,d.ratio).y*100}%;width:${s.size/W*100}%;height:${s.size/H*100}%;transform:translate(-50%,-50%) rotate(${s.rotation}rad)" aria-label="移动贴纸 ${esc(getSticker(s.kind)?.name??'自定义贴纸')}"></button>`).join(''):'');
  host.querySelectorAll<HTMLButtonElement>('[data-field]').forEach(b=>b.onclick=()=>beginInlineEdit(b.dataset.field as WritingField|'mood'));
  host.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.onclick=()=>{if(busy)return;stop();uploadTarget={page,slot:Number(b.dataset.slot)};customStickerUpload=false;const input=$<HTMLInputElement>('#media-input');input.multiple=false;input.click();});
  host.querySelectorAll<HTMLButtonElement>('[data-play-slot]').forEach(b=>b.onclick=async()=>{
    if(busy)return;stop();const v=b.parentElement!.querySelector('video')!;host.querySelectorAll('video').forEach(other=>{if(other!==v)other.pause();});
    v.style.opacity='1';try{await v.play();b.hidden=true;}catch{toast('视频无法播放，请更换兼容的 MP4 视频');}
    v.onended=()=>{b.hidden=false;b.querySelector('span')!.textContent='再看一次';};
  });
  host.querySelectorAll<HTMLButtonElement>('[data-placed-sticker]').forEach(b=>{
    let moving=false,changedPosition=false;
    b.onpointerdown=e=>{e.preventDefault();e.stopPropagation();selectedSticker=b.dataset.placedSticker!;b.setPointerCapture(e.pointerId);moving=true;changedPosition=false;updateStickerSelection();};
    b.onpointermove=e=>{if(!moving)return;const s=diary.stickers.find(s=>s.id===selectedSticker);if(!s)return;const bounds=canvas.getBoundingClientRect();moveSticker(s,(e.clientX-bounds.left)/bounds.width,(e.clientY-bounds.top)/bounds.height);b.style.left=`${s.x*100}%`;b.style.top=`${s.y*100}%`;changedPosition=true;paint();};
    const finish=()=>{if(!moving)return;moving=false;if(changedPosition)changed();else updateStickerSelection();};b.onpointerup=finish;b.onpointercancel=finish;
    b.onclick=()=>{selectedSticker=b.dataset.placedSticker!;updateStickerSelection();};
    b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key))return;e.preventDefault();selectedSticker=b.dataset.placedSticker!;const s=diary.stickers.find(s=>s.id===selectedSticker);if(!s)return;if(e.key==='Delete'||e.key==='Backspace'){diary.stickers=diary.stickers.filter(x=>x.id!==s.id);selectedSticker='';}else{const pos=stickerPosition(s,displayDiary().ratio);moveSticker(s,pos.x+(e.key==='ArrowRight'?.005:e.key==='ArrowLeft'?-.005:0),pos.y+(e.key==='ArrowDown'?.005:e.key==='ArrowUp'?-.005:0));}changed();};
  });
}
let stickerCategory='全部';
function renderStickerLibrary(){
  const categories=['全部',...new Set(catalog.map(s=>s.category)),'自定义'];
  $('#sticker-categories').innerHTML=categories.map(c=>`<button data-category="${esc(c)}" class="${c===stickerCategory?'active':''}">${esc(c)}</button>`).join('');
  const query=$<HTMLInputElement>('#sticker-search').value.trim().toLowerCase();
  const items=catalog.filter(s=>(stickerCategory==='全部'||stickerCategory===s.category)&&(!query||[s.name,...s.tags].some(t=>t.toLowerCase().includes(query))));
  const custom=media.filter(m=>m.asset.role==='sticker'&&(stickerCategory==='全部'||stickerCategory==='自定义')&&(!query||m.asset.name.toLowerCase().includes(query)));
  $('#sticker-grid').innerHTML=items.map(s=>`<button data-sticker="${s.id}" aria-label="添加${esc(s.name)}贴纸">${s.svg}<span>${esc(s.name)}</span></button>`).join('')+custom.map(m=>`<button data-sticker="asset:${esc(m.asset.id)}" aria-label="添加自定义贴纸 ${esc(m.asset.name)}"><img src="${esc(m.url)}" alt=""><span>${esc(m.asset.name)}</span></button>`).join('');
  if(!items.length&&!custom.length)$('#sticker-grid').innerHTML='<p class="empty-day">暂时没找到，换一个关键词试试。</p>';
}
function moveSticker(s:StickerPlacement,x:number,y:number){s.x=Math.max(.02,Math.min(.98,x));s.y=Math.max(.02,Math.min(.98,y));s.positions??={};s.positions[displayDiary().ratio]={x:s.x,y:s.y};}
function addSticker(kind:string){
  if(diary.stickers.length>=100){toast('每篇最多放 100 个贴纸');return;}
  const n=diary.stickers.filter(s=>s.page===page).length;
  const id=crypto.randomUUID(),positions={landscape:{x:.45-(n%4)*.075,y:.705},portrait:{x:.80-(n%4)*.15,y:.79}},pos=positions[displayDiary().ratio];diary.stickers.push({id,kind,page,...pos,positions,size:displayDiary().ratio==='portrait'?85:76,rotation:(n%3-1)*.08});selectedSticker=id;
  changed();if(keyboardOpen)renderKeyboard();
}
function updateStickerSelection(){
  const s=diary.stickers.find(s=>s.id===selectedSticker&&s.page===page),ring=$('#sticker-selection');
  ring.hidden=!s;$('#sticker-tools').hidden=!s||reading;$('#keyboard-selected').hidden=!s;if(!s)return;
  const [W,H]=dimensions(displayDiary()),pos=stickerPosition(s,displayDiary().ratio);ring.style.cssText=`left:${pos.x*100}%;top:${pos.y*100}%;width:${s.size/W*100}%;height:${s.size/H*100}%;transform:translate(-50%,-50%) rotate(${s.rotation}rad)`;
  $<HTMLInputElement>('#sticker-size').value=String(s.size);$<HTMLInputElement>('#sticker-rotation').value=String(s.rotation*180/Math.PI);
  $<HTMLInputElement>('#quick-sticker-size').value=String(s.size);$<HTMLInputElement>('#quick-sticker-rotation').value=String(s.rotation*180/Math.PI);
}
$('#sticker-search').oninput=renderStickerLibrary;
$('#sticker-categories').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-category]');if(b){stickerCategory=b.dataset.category!;renderStickerLibrary();}};
$('#sticker-grid').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-sticker]');if(b)addSticker(b.dataset.sticker!);};
$('#sticker-size').oninput=()=>{const s=diary.stickers.find(s=>s.id===selectedSticker);if(s){s.size=Number($<HTMLInputElement>('#sticker-size').value);paint();}};
$('#sticker-size').onchange=()=>changed();
$('#sticker-rotation').oninput=()=>{const s=diary.stickers.find(s=>s.id===selectedSticker);if(s){s.rotation=Number($<HTMLInputElement>('#sticker-rotation').value)*Math.PI/180;paint();}};
$('#sticker-rotation').onchange=()=>changed();
$('#remove-sticker').onclick=()=>{diary.stickers=diary.stickers.filter(s=>s.id!==selectedSticker);selectedSticker='';changed();};
$('#deselect-sticker').onclick=()=>{selectedSticker='';buildHotspots();updateStickerSelection();};
$('#custom-sticker').onclick=()=>$<HTMLInputElement>('#sticker-input').click();
$<HTMLInputElement>('#sticker-input').onchange=e=>{const input=e.target as HTMLInputElement;const files=Array.from(input.files??[]);if(files.length){customStickerUpload=true;void addFiles(files).then(()=>renderStickerLibrary());}input.value='';};
$<HTMLInputElement>('#media-input').addEventListener('cancel',()=>{uploadTarget=undefined;customStickerUpload=false;});
$('#dropzone').addEventListener('click',e=>{if(e.target instanceof HTMLInputElement)return;uploadTarget=undefined;customStickerUpload=false;$<HTMLInputElement>('#media-input').multiple=true;});
function renderMoods(){const current=getMoodSticker(diary.mood);$('#mood-picker').innerHTML=moods.map(m=>`<button data-mood="${esc(m.name)}" class="${m.sticker===current?'selected':''}">${getSticker(m.sticker)?.svg??''}<span>${esc(m.name)}</span></button>`).join('');}
$('#mood-picker').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-mood]');if(!b)return;diary.mood=b.dataset.mood!;fill();changed();};
$('#share-video').onclick=async()=>{
  if(!resultBlob)return;const file=new File([resultBlob],resultName,{type:resultBlob.type});
  if(navigator.canShare?.({files:[file]}))try{await navigator.share({files:[file],title:diary.title||'口袋日记'});}catch(e){if((e as Error).name!=='AbortError')toast('系统分享未完成，请先保存视频，再到小红书或微信发布');}
  else {download(resultBlob,resultName);toast('请保存视频，再从小红书或微信相册发布');}
};
function completeStartup(restore=false){
  const previous=restore&&savedView?.id===entryId?savedView:undefined;
  viewRatio=previous?.ratio;initialized=true;busy=false;$('.workspace').inert=false;$('.topbar').inert=false;
  $('.workspace').classList.remove('is-loading');$('.workspace').setAttribute('aria-busy','false');$('#startup-state').hidden=true;
  fill();setMode(previous?.reading??true);page=Math.min(previous?.page??0,pages.length-1);renderStickerLibrary();refresh(true);
}
$('#startup-retry').onclick=()=>location.reload();
$('#startup-import').onclick=()=>$<HTMLInputElement>('#project-input').click();
async function boot(){
  busy=true;$('.workspace').inert=true;$('.topbar').inert=true;$('#save-state').textContent='正在打开…';
  try{const [,,stored]=await Promise.all([prepareCatalog(),prepareNotebookAssets(),loadEntries()]);entries=stored.entries;
    const current=entries.find(e=>e.id===savedView?.id)??entries.find(e=>e.id===stored.active)??entries[0];
    if(current){entryId=current.id;diary=structuredClone(current.diary);await attach(current.assets.map(a=>({...a})));$('#save-state').textContent=`已收藏 ${entries.length} 篇日记`;}
    else{await attach(sampleAssets());entries=[{id:entryId,diary:structuredClone(diary),assets,updatedAt:Date.now()}];await saveEntry(entries[0]);$('#save-state').textContent='示例日记';}}
  catch(e){busy=false;$('#startup-state').classList.add('failed');$('#startup-title').textContent='日记暂时没有打开';$('#startup-description').textContent=`${(e as Error).message}。请重试，或导入之前的备份。`;$('#startup-actions').hidden=false;$('#save-state').textContent='等待恢复';return;}
  completeStartup(true);
  if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>toast('离线缓存暂不可用，联网状态仍可继续使用'));
}
void boot();
