import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { validateDiary, type Diary, type Asset } from './model';
const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open('daybook-studio', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('projects');
  req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
});
export async function save(diary: Diary, assets: Asset[]) {
  const db = await dbPromise;
  await new Promise<void>((resolve,reject) => {
    const tx = db.transaction('projects','readwrite'); tx.objectStore('projects').put({diary,assets}, 'current');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
export async function load(): Promise<{diary: Diary; assets: Asset[]} | undefined> {
  const db = await dbPromise;
  return new Promise((resolve,reject) => {
    const req = db.transaction('projects').objectStore('projects').get('current');
    req.onsuccess = () => resolve(req.result ? { diary: validateDiary(req.result.diary), assets: req.result.assets } : undefined);
    req.onerror = () => reject(req.error);
  });
}
export async function pack(diary: Diary, assets: Asset[]): Promise<Blob> {
  if (assets.reduce((n,a)=>n+a.blob.size,0)>400*1024*1024) throw new Error('工程包暂支持 400 MB 以内素材，请减少素材后备份');
  const entries: Record<string,Uint8Array> = {};
  const manifest = { diary, assets: [] as object[] };
  for (let i=0; i<assets.length; i++) {
    const a=assets[i], path=`media/${i}`;
    entries[path]=new Uint8Array(await a.blob.arrayBuffer());
    manifest.assets.push({id:a.id,name:a.name,type:a.type,mime:a.blob.type,path,duration:a.duration});
  }
  entries['project.json']=strToU8(JSON.stringify(manifest));
  const bytes=zipSync(entries,{level:0}); return new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
export async function unpack(file: File): Promise<{diary: Diary; assets: Asset[]}> {
  if(file.size>420*1024*1024) throw new Error('工程包超过 420 MB，无法导入');
  let total=0;
  const entries=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter: entry=> {
    if(entry.originalSize>200*1024*1024) throw new Error('工程中的单个文件过大');
    total+=entry.originalSize;
    if(total>450*1024*1024) throw new Error('工程解压后过大');
    return entry.name==='project.json'||/^media\/\d+$/.test(entry.name);
  }});
  if(!entries['project.json']||entries['project.json'].length>200000) throw new Error('不是有效的日记工程包');
  const m=JSON.parse(strFromU8(entries['project.json'])); const diary=validateDiary(m.diary);
  if(!Array.isArray(m.assets)||m.assets.length>20) throw new Error('工程素材数量无效');
  const ids=new Set<string>();
  const assets=m.assets.map((a: Record<string,unknown>)=> {
    if(typeof a.id!=='string'||ids.has(a.id)||typeof a.path!=='string'||!/^media\/\d+$/.test(a.path)||!entries[a.path]||!['image','video'].includes(String(a.type))||typeof a.mime!=='string'||!/^image\/(png|jpeg|webp|gif|svg\+xml)$|^video\/(mp4|webm|quicktime|ogg)$/.test(a.mime)) throw new Error('工程素材无效或不支持');
    ids.add(a.id);
    return {id:a.id,name:String(a.name).slice(0,120),type:a.type,blob:new Blob([entries[a.path] as Uint8Array<ArrayBuffer>],{type:a.mime}),duration:Number(a.duration)||undefined} as Asset;
  });
  return {diary,assets};
}
export function download(blob: Blob, name: string) {
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
