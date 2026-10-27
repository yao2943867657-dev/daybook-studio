import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, wrapText, validateDiary, initialDiary, themes } from '../src/model';
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
