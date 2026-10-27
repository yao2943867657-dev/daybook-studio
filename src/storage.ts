import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { validateDiary, sortEntries, type Entry, type Diary, type Asset } from './model';

const MB=1024*1024;
const MAX_PAYLOAD=400*MB, MAX_ARCHIVE=420*MB, MAX_EXPANDED=450*MB;
const MAX_ASSET=200*MB, MAX_ENTRIES=5000, MAX_MANIFEST=5*MB;
let dbPromise:Promise<IDBDatabase>|undefined;
function database():Promise<IDBDatabase> {
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open('daybook-studio',2);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects');
      if(!req.result.objectStoreNames.contains('entries'))req.result.createObjectStore('entries',{keyPath:'id'});
    };
    req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=undefined;};resolve(db);};
    req.onerror=()=>{dbPromise=undefined;reject(req.error);};
    req.onblocked=()=>{dbPromise=undefined;reject(new Error('请关闭其他旧版日记页面，再刷新以升级日记本'));};
  });
  return dbPromise;
}
const validId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160;
function checkedDate(date:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(`${date}T12:00:00Z`))||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)throw new Error('日记日期无效');
}
function checkedAssets(input:unknown):Asset[] {
  if(!Array.isArray(input)||input.length>120)throw new Error('日记素材数量无效');
  const ids=new Set<string>();let regular=0,stickers=0;
  return input.map((a:Asset)=>{
    if(!a||!validId(a.id)||ids.has(a.id)||typeof a.name!=='string'||!(a.blob instanceof Blob)||!['image','video'].includes(a.type)||a.blob.size>MAX_ASSET)throw new Error('日记素材无效或重复');
    if(a.role!==undefined&&a.role!=='sticker')throw new Error('贴纸类型无效');
    if(a.role==='sticker'&&a.type!=='image')throw new Error('自定义贴纸需要是图片');
    if(a.role==='sticker')stickers++;else regular++;
    if(regular>20||stickers>100)throw new Error('每篇最多支持 20 份照片/视频和 100 张自定义贴纸');
    ids.add(a.id);
    return {id:a.id,name:a.name.slice(0,120),type:a.type,blob:a.blob,...(a.role?{role:a.role}:{}),...(typeof a.duration==='number'&&Number.isFinite(a.duration)&&a.duration>=0?{duration:a.duration}:{})};
  });
}
function checkedEntry(input:Entry):Entry {
  if(!input||!validId(input.id)||!Number.isFinite(input.updatedAt)||input.updatedAt<0)throw new Error('日记记录信息无效');
  const diary=validateDiary(input.diary);checkedDate(diary.date);
  return {id:input.id,diary,assets:checkedAssets(input.assets),updatedAt:input.updatedAt};
}
function failTransaction(tx:IDBTransaction,reject:(reason:unknown)=>void,error:unknown){try{tx.abort();}catch{}reject(error);}

/** Saves one entry and its active pointer atomically, without replacing other days. */
export async function saveEntry(input:Entry):Promise<void> {
  const entry=checkedEntry(input),db=await database();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['entries','projects'],'readwrite');
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('保存被中断'));
    try{tx.objectStore('entries').put(entry);tx.objectStore('projects').put(entry.id,'active');}catch(e){failTransaction(tx,reject,e);}
  });
}

/** Migrates v0.1's current entry once, retaining the original legacy copy. */
export async function loadEntries():Promise<{entries:Entry[];active?:string}> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['entries','projects'],'readwrite');
    const entriesRequest=tx.objectStore('entries').getAll();
    const activeRequest=tx.objectStore('projects').get('active');
    const legacyRequest=tx.objectStore('projects').get('current');
    let entries:Entry[]=[],active:string|undefined,ready=0;
    const loaded=()=>{
      if(++ready!==3)return;
      try{
        entries=entriesRequest.result.map(checkedEntry);
        if(!entries.length&&legacyRequest.result){
          const legacy=legacyRequest.result;
          const migrated=checkedEntry({id:'legacy-current',diary:legacy.diary,assets:legacy.assets,updatedAt:Date.now()});
          tx.objectStore('entries').put(migrated);entries=[migrated];
          tx.objectStore('projects').put(migrated.id,'active');active=migrated.id;
        }else active=entries.some(e=>e.id===activeRequest.result)?activeRequest.result:sortEntries(entries)[0]?.id;
      }catch(e){failTransaction(tx,reject,e);}
    };
    entriesRequest.onsuccess=loaded;activeRequest.onsuccess=loaded;legacyRequest.onsuccess=loaded;
    tx.oncomplete=()=>resolve({entries:sortEntries(entries),active});tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('读取日记本被中断'));
  });
}

/** Compatibility helpers for the original single-entry project format. */
export async function save(diary:Diary,assets:Asset[]):Promise<void> {
  const valid=validateDiary(diary);checkedDate(valid.date);const clean=checkedAssets(assets),db=await database();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('projects','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('保存被中断'));
    try{tx.objectStore('projects').put({diary:valid,assets:clean},'current');}catch(e){failTransaction(tx,reject,e);}
  });
}
export async function load():Promise<{diary:Diary;assets:Asset[]}|undefined> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('projects'),req=tx.objectStore('projects').get('current');let value:{diary:Diary;assets:Asset[]}|undefined;
    req.onsuccess=()=>{try{if(req.result)value={diary:validateDiary(req.result.diary),assets:checkedAssets(req.result.assets)};}catch(e){failTransaction(tx,reject,e);}};
    tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('读取被中断'));
  });
}

interface AssetManifest { id:string;name:string;type:'image'|'video';mime:string;path:string;duration?:number;role?:'sticker' }
interface ProjectManifest {diary:Diary;assets:AssetManifest[]}
async function projectManifest(diary:Diary,input:Asset[],prefix:string,files:Record<string,Uint8Array>):Promise<ProjectManifest>{
  const valid=validateDiary(diary);checkedDate(valid.date);const assets=checkedAssets(input),manifest:ProjectManifest={diary:valid,assets:[]};
  for(let i=0;i<assets.length;i++){
    const a=assets[i],path=`${prefix}/${i}`;files[path]=new Uint8Array(await a.blob.arrayBuffer());
    manifest.assets.push({id:a.id,name:a.name,type:a.type,mime:a.blob.type,path,duration:a.duration,...(a.role?{role:a.role}:{})});
  }
  return manifest;
}
function payloadSize(entries:{assets:Asset[]}[]){if(entries.reduce((n,e)=>n+e.assets.reduce((s,a)=>s+a.blob.size,0),0)>MAX_PAYLOAD)throw new Error('备份暂支持总计 400 MB 以内素材，请减少素材或分别备份日记');}
function zip(files:Record<string,Uint8Array>):Blob {return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});}
export async function pack(diary:Diary,assets:Asset[]):Promise<Blob>{
  payloadSize([{assets}]);const files:Record<string,Uint8Array>={};files['project.json']=strToU8(JSON.stringify(await projectManifest(diary,assets,'media',files)));return zip(files);
}
export async function packNotebook(input:Entry[]):Promise<Blob>{
  if(!Array.isArray(input)||input.length>MAX_ENTRIES)throw new Error('日记数量超过备份限制');
  const entries=input.map(checkedEntry);const ids=new Set(entries.map(e=>e.id));if(ids.size!==entries.length)throw new Error('日记记录存在重复编号');payloadSize(entries);
  const files:Record<string,Uint8Array>={},manifest={version:2,entries:[] as (ProjectManifest&{id:string;updatedAt:number})[]};
  for(let i=0;i<entries.length;i++){const e=entries[i];manifest.entries.push({id:e.id,updatedAt:e.updatedAt,...await projectManifest(e.diary,e.assets,`media/${i}`,files)});}
  const json=strToU8(JSON.stringify(manifest));if(json.length>MAX_MANIFEST)throw new Error('日记目录过大，请分批备份');files['notebook.json']=json;return zip(files);
}
async function archive(file:File):Promise<Record<string,Uint8Array>> {
  if(file.size>MAX_ARCHIVE)throw new Error('工程包超过 420 MB，无法导入');let total=0;const names=new Set<string>();
  return unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:entry=>{
    if(names.has(entry.name))throw new Error('工程包存在重复文件');names.add(entry.name);
    if(!Number.isFinite(entry.originalSize)||entry.originalSize<0)throw new Error('工程包文件信息无效');
    total+=entry.originalSize;if(total>MAX_EXPANDED)throw new Error('工程解压后超过 450 MB');
    const isManifest=entry.name==='project.json'||entry.name==='notebook.json';
    if(entry.originalSize>(isManifest?MAX_MANIFEST:MAX_ASSET))throw new Error('工程中的单个文件过大');
    return isManifest||/^media\/\d+(?:\/\d+)?$/.test(entry.name);
  }});
}
function jsonManifest(files:Record<string,Uint8Array>,name:string):unknown{
  if(!files[name]||files[name].length>MAX_MANIFEST)throw new Error('不是有效的日记工程包');
  try{return JSON.parse(strFromU8(files[name]));}catch{throw new Error('日记目录无法读取');}
}
function readProject(input:unknown,files:Record<string,Uint8Array>,paths:Set<string>):{diary:Diary;assets:Asset[]} {
  if(!input||typeof input!=='object')throw new Error('日记内容无效');const m=input as Record<string,unknown>;
  const diary=validateDiary(m.diary);checkedDate(diary.date);
  if(!Array.isArray(m.assets)||m.assets.length>120)throw new Error('工程素材数量无效');
  const assets=m.assets.map((value:unknown)=>{
    if(!value||typeof value!=='object')throw new Error('工程素材无效');const a=value as Record<string,unknown>;
    if(!validId(a.id)||typeof a.name!=='string'||typeof a.path!=='string'||!/^media\/\d+(?:\/\d+)?$/.test(a.path)||!files[a.path]||paths.has(a.path)||typeof a.mime!=='string')throw new Error('工程素材路径无效或重复');
    if(a.type==='image'?!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(a.mime):a.type==='video'?!/^video\/(mp4|webm|quicktime|ogg)$/.test(a.mime):true)throw new Error('工程素材格式不受支持');
    if(a.role!==undefined&&a.role!=='sticker')throw new Error('贴纸类型无效');paths.add(a.path);
    return {id:a.id,name:a.name,type:a.type,blob:new Blob([files[a.path] as Uint8Array<ArrayBuffer>],{type:a.mime}),...(a.role?{role:a.role}:{}),...(typeof a.duration==='number'&&Number.isFinite(a.duration)&&a.duration>=0?{duration:a.duration}:{})} as Asset;
  });
  return {diary,assets:checkedAssets(assets)};
}
export async function unpack(file:File):Promise<{diary:Diary;assets:Asset[]}>{
  const files=await archive(file);if(files['notebook.json'])throw new Error('这是整本日记备份，请使用整本恢复入口');return readProject(jsonManifest(files,'project.json'),files,new Set());
}
/** Accepts both v0.1 single-project and v0.2 whole-notebook ZIPs, without changing storage. */
export async function unpackNotebook(file:File):Promise<Entry[]>{
  const files=await archive(file),paths=new Set<string>();
  if(!files['notebook.json'])return [{id:crypto.randomUUID(),...readProject(jsonManifest(files,'project.json'),files,paths),updatedAt:Date.now()}];
  const m=jsonManifest(files,'notebook.json') as Record<string,unknown>;
  if(!m||m.version!==2||!Array.isArray(m.entries)||m.entries.length>MAX_ENTRIES)throw new Error('日记本备份版本或篇数无效');const ids=new Set<string>();
  const entries=m.entries.map((input:unknown)=>{
    if(!input||typeof input!=='object')throw new Error('日记记录无效');const e=input as Record<string,unknown>;
    if(!validId(e.id)||ids.has(e.id)||typeof e.updatedAt!=='number'||!Number.isFinite(e.updatedAt)||e.updatedAt<0)throw new Error('日记记录编号重复或信息无效');ids.add(e.id);
    return {id:e.id,updatedAt:e.updatedAt,...readProject(e,files,paths)};
  });return sortEntries(entries);
}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
