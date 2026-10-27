import 'fake-indexeddb/auto';
import { IDBDatabase } from 'fake-indexeddb';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync,zipSync,strToU8,strFromU8 } from 'fflate';
import { initialDiary,type Entry,type Asset } from '../src/model';
import { load,loadEntries,saveEntry,pack,unpack,packNotebook,unpackNotebook } from '../src/storage';

const asset=(id='photo'):Asset=>({id,name:`${id}.png`,type:'image',blob:new Blob(['original picture bytes'],{type:'image/png'})});
const entry=(id:string,date:string):Entry=>({id,diary:{...initialDiary(),date,title:`日记 ${id}`},assets:[asset()],updatedAt:Date.parse(`${date}T12:00:00Z`)});
const file=(blob:Blob)=>new File([blob],'diary.zip',{type:'application/zip'});
const open=(version:number)=>new Promise<IDBDatabase>((resolve,reject)=>{
  const req=indexedDB.open('daybook-studio',version);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});

test('旧单篇日记无损迁移、并发迁移幂等并保留旧存储',async()=>{
  const db=await open(1),legacy=entry('old','2026-10-20');
  const oldDiary=JSON.parse(JSON.stringify(legacy.diary));delete oldDiary.stickers;delete oldDiary.layout;delete oldDiary.pageSlots;
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({diary:oldDiary,assets:legacy.assets},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  const [a,b]=await Promise.all([loadEntries(),loadEntries()]);
  assert.equal(a.entries.length,1);assert.equal(b.entries.length,1);assert.equal(a.active,b.active);
  assert.equal(a.entries[0].diary.date,'2026-10-20');assert.equal(a.entries[0].diary.title,legacy.diary.title);
  assert.deepEqual(a.entries[0].diary.stickers,[]);assert.equal(a.entries[0].diary.layout,'single');
  assert.equal(await a.entries[0].assets[0].blob.text(),'original picture bytes');
  assert.equal((await load())?.diary.title,legacy.diary.title);
});

test('不同日期独立保存，同一记录更改日期也不覆盖别的日记',async()=>{
  const a=entry('day-a','2026-10-21'),b=entry('day-b','2026-10-22');
  await saveEntry(a);await saveEntry(b);a.diary.date='2026-10-22';a.diary.title='更新 A';await saveEntry(a);
  const book=await loadEntries();assert.equal(book.active,'day-a');
  assert.equal(book.entries.length,3);assert.equal(book.entries.find(e=>e.id==='day-b')?.diary.title,'日记 day-b');
  assert.equal(book.entries.find(e=>e.id==='day-a')?.diary.title,'更新 A');
  assert.deepEqual(book.entries.map(e=>e.diary.date),['2026-10-22','2026-10-22','2026-10-20']);
});

test('保存事务被中断会拒绝，不写入半份记录或错误激活指针',async()=>{
  const original=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args:Parameters<typeof original>){const tx=original.apply(this,args);queueMicrotask(()=>{try{tx.abort();}catch{}});return tx;};
  try{await assert.rejects(saveEntry(entry('aborted','2026-10-25')));}finally{IDBDatabase.prototype.transaction=original;}
  const book=await loadEntries();assert.equal(book.active,'day-a');assert.equal(book.entries.some(e=>e.id==='aborted'),false);
});

test('旧单篇 ZIP 兼容，并保留自定义贴纸与排版',async()=>{
  const d=initialDiary();d.stickers=[{id:'placed',kind:'asset:sticker',page:0,x:.42,y:.6,size:60,rotation:.1}];d.layout='duo';d.pageSlots={'0':['photo','']};
  const sticker={...asset('sticker'),role:'sticker' as const};const packed=await pack(d,[asset(),sticker]);const restored=await unpack(file(packed));
  assert.deepEqual(restored.diary.stickers,d.stickers);assert.equal(restored.diary.layout,'duo');assert.deepEqual(restored.diary.pageSlots,d.pageSlots);
  assert.equal(restored.assets[1].role,'sticker');assert.equal(await restored.assets[1].blob.text(),'original picture bytes');
  assert.equal((await unpackNotebook(file(packed))).length,1);
});

test('整本 ZIP 往返保留多篇、日期、原始素材和独立编号',async()=>{
  const a=entry('book-a','2026-09-01'),b=entry('book-b','2026-10-27');b.assets.push({...asset('cutout'),role:'sticker'});
  const restored=await unpackNotebook(file(await packNotebook([a,b])));
  assert.deepEqual(restored.map(e=>e.id),['book-b','book-a']);assert.equal(restored[0].updatedAt,b.updatedAt);
  assert.equal(restored[0].assets[1].role,'sticker');assert.equal(await restored[1].assets[0].blob.text(),'original picture bytes');
  assert.equal((await loadEntries()).entries.length,3,'解析备份本身不修改当前日记本');
});

test('拒绝路径穿越、伪造日期、贴纸视频、重复记录和重复素材引用',async()=>{
  const single=unzipSync(new Uint8Array(await (await pack(initialDiary(),[asset()])).arrayBuffer()));
  const p=JSON.parse(strFromU8(single['project.json']));p.assets[0].path='../private.png';single['project.json']=strToU8(JSON.stringify(p));
  await assert.rejects(unpack(file(new Blob([zipSync(single) as Uint8Array<ArrayBuffer>]))),/路径/);
  await assert.rejects(saveEntry({...entry('bad-date','2026-10-20'),diary:{...initialDiary(),date:'2026-02-31'}}),/日期/);
  await assert.rejects(pack(initialDiary(),[{...asset(),type:'video',role:'sticker'}]),/贴纸/);
  const a=entry('duplicate','2026-10-27');await assert.rejects(packNotebook([a,a]),/重复/);
  const book=unzipSync(new Uint8Array(await (await packNotebook([entry('x','2026-10-27'),entry('y','2026-10-26')])).arrayBuffer()));
  const m=JSON.parse(strFromU8(book['notebook.json']));m.entries[1].assets[0].path=m.entries[0].assets[0].path;book['notebook.json']=strToU8(JSON.stringify(m));
  await assert.rejects(unpackNotebook(file(new Blob([zipSync(book) as Uint8Array<ArrayBuffer>]))),/重复/);
});
