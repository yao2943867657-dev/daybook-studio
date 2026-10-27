import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, wrapText, validateDiary, initialDiary, themes, calendarCells, slotCount, sortEntries, type Entry } from '../src/model';
import { mediaRects,mediaForSlot } from '../src/renderer';
import type { LoadedMedia } from '../src/media';
const measure=(s:string)=>Array.from(s).length*10;
test('长中文分页不丢字，保留段落顺序',()=>{
  const body='今天我们到公园看花。'.repeat(80)+'\n第二段是一个新故事。';
  const pages=paginate(body,100,7,measure);
  assert.ok(pages.length>2);assert.ok(pages.every(p=>p.length<=7));
  assert.equal(pages.flat().map(l=>l.text).join(''),body.replaceAll('\n',''));
  assert.equal(pages.flat().at(-1)?.paragraph,1);
});
test('句尾标点不单独挤到下一行',()=>{
  const lines=wrapText('今天阳光好，出去走走。',50,measure);
  assert.ok(lines.every(l=>! /^[，。]/.test(l)));assert.equal(lines.join(''),'今天阳光好，出去走走。');
});
test('空日记仍有一页，emoji 不拆成代理字符',()=>{
  assert.equal(paginate('',100,7,measure).length,1);
  assert.deepEqual(wrapText('🌷🌷🌷',10,measure),['🌷','🌷','🌷']);
});
test('导入工程校验版本、文字长度、主题及边界',()=>{
  assert.throws(()=>validateDiary({...initialDiary(),version:2}));
  assert.throws(()=>validateDiary({...initialDiary(),body:'字'.repeat(10001)}));
  const d=validateDiary({...initialDiary(),theme:'bad',seconds:100,decoration:-1,pageMedia:{__proto__:'bad','0':'ok','abc':'bad'}});
  assert.equal(d.theme,'sketch');assert.equal(d.seconds,12);assert.equal(d.decoration,0);assert.deepEqual(d.pageMedia,{'0':'ok'});
  assert.equal(new Set(themes.map(t=>t.id)).size,8);
});

test('日历以周一开头，正确放置周日及月末，固定六周不串月',()=>{
  const month=calendarCells(2026,1);
  assert.equal(month.length,42);assert.deepEqual(month.slice(0,6),Array(6).fill(null));
  assert.equal(month[6],'2026-02-01');assert.equal(month[33],'2026-02-28');
  assert.ok(month.slice(34).every(day=>day===null));
});

test('导入页码限制防止异常备份创建无限书页',()=>{
  const d=validateDiary({...initialDiary(),pageSlots:{'0':['a'],'999999999':['b']},pageMedia:{'999999999':'b'},stickers:[{id:'x',kind:'sun',page:Infinity,x:.5,y:.5,size:70,rotation:0}]});
  assert.deepEqual(d.pageSlots,{'0':['a']});assert.deepEqual(d.pageMedia,{});assert.equal(d.stickers[0].page,0);
});

test('日历正确处理闰年与非闰世纪年',()=>{
  const leap=calendarCells(2024,1),ordinary=calendarCells(2100,1);
  assert.equal(leap.filter(Boolean).length,29);assert.ok(leap.includes('2024-02-29'));
  assert.equal(ordinary.filter(Boolean).length,28);assert.ok(!ordinary.includes('2100-02-29'));
  assert.equal(calendarCells(2026,11).filter(Boolean).at(-1),'2026-12-31');
});

test('日记按日期而非最后编辑时间排序，同一天按更新排序且不改原数组',()=>{
  const item=(id:string,date:string,updatedAt:number):Entry=>({id,diary:{...initialDiary(),date},assets:[],updatedAt});
  const original=[item('old','2026-10-01',900),item('new','2026-10-27',100),item('newer-edit','2026-10-27',200)];
  assert.deepEqual(sortEntries(original).map(e=>e.id),['newer-edit','new','old']);
  assert.deepEqual(original.map(e=>e.id),['old','new','newer-edit']);
});

test('布局槽位数量与旧工程的默认布局保持兼容',()=>{
  assert.deepEqual(['single','duo','trio','wall'].map(l=>slotCount(l as Parameters<typeof slotCount>[0])),[1,2,3,4]);
  const old={...initialDiary()} as Record<string,unknown>;delete old.layout;delete old.pageSlots;delete old.stickers;
  const migrated=validateDiary(old);assert.equal(slotCount(migrated.layout),1);assert.deepEqual(migrated.pageSlots,{});assert.deepEqual(migrated.stickers,[]);
  const slots=validateDiary({...initialDiary(),layout:'trio',pageSlots:{'0':['one','two','three','four','five'],'bad':['ignored']}});
  assert.deepEqual(slots.pageSlots,{'0':['one','two','three','four']});
});

test('所有本子和横竖屏的画框数匹配布局，画框保持在页面内',()=>{
  for(const theme of themes)for(const ratio of ['landscape','portrait'] as const)for(const layout of ['single','duo','trio','wall'] as const){
    const d={...initialDiary(),theme:theme.id,ratio,layout};const rects=mediaRects(d),[W,H]=ratio==='portrait'?[900,1600]:[1600,900];
    assert.equal(rects.length,slotCount(layout),`${theme.id} ${ratio} ${layout}`);
    assert.ok(rects.every(r=>r.w>0&&r.h>0&&r.x>=0&&r.y>=0&&r.x+r.w<=W&&r.y+r.h<=H));
  }
});

test('素材槽位自动排序排除贴纸，明确空槽不回退，旧页映射仍能读取',()=>{
  const make=(id:string,role?:'sticker'):LoadedMedia=>({asset:{id,name:id,type:'image',blob:new Blob(['x'],{type:'image/png'}),...(role?{role}:{})},element:{} as HTMLImageElement,url:`blob:${id}`});
  const media=[make('a'),make('cutout','sticker'),make('b'),make('c'),make('d')];
  const d={...initialDiary(),layout:'duo' as const};
  assert.equal(mediaForSlot(d,0,0,media)?.asset.id,'a');assert.equal(mediaForSlot(d,0,1,media)?.asset.id,'b');assert.equal(mediaForSlot(d,1,0,media)?.asset.id,'c');
  d.pageSlots={'0':['__empty__','d']};assert.equal(mediaForSlot(d,0,0,media),undefined);assert.equal(mediaForSlot(d,0,1,media)?.asset.id,'d');
  d.pageSlots={};d.pageMedia={'0':'c'};assert.equal(mediaForSlot(d,0,0,media)?.asset.id,'c');assert.equal(mediaForSlot(d,0,1,media)?.asset.id,'b');
});
