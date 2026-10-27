import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inlineToken,graphemes,moveInline,measureInline} from '../src/inline-content';
import {initialDiary,validateDiary,paginate,wrapText} from '../src/model';
import {bodyPageRange,replaceBodyRange} from '../src/text-editing';
import {pack,unpack} from '../src/storage';

test('行内贴纸不碰撞原文私用字符，同一素材复用映射',()=>{
  const map:Record<string,string>={},token=inlineToken(map,'chat-hug','\ue000');
  assert.equal(token,'\ue001');assert.equal(inlineToken(map,'chat-hug'),token);
  assert.notEqual(inlineToken(map,'asset:custom'),token);
  const d=validateDiary({...initialDiary(),inlineStickers:{...map,'bad':'<script>','\ue009':'javascript:bad()'}});
  assert.deepEqual(d.inlineStickers,map);assert.deepEqual(validateDiary(initialDiary()).inlineStickers,{});
});
test('行内贴纸参与换行与分页，修改当前页保留后页映射和正文',()=>{
  const map={'\ue000':'chat-hug'},body='看花\ue000开心。'.repeat(20),measure=(s:string)=>measureInline(s,map,20,t=>t.length*10);
  const pages=paginate(body,60,3,measure);assert.ok(pages.length>2);
  assert.equal(pages.flat().map(l=>l.text).join(''),body);
  const range=bodyPageRange(body,pages,1),changed=replaceBodyRange(body,range.start,range.end,range.text+'🥰');
  assert.equal(changed.slice(range.end+2),body.slice(range.end));
  assert.equal(measure('花\ue000花'),40);
});
test('移动行内表情支持前后位置、首尾与原位置，组合表情不拆开',()=>{
  const emoji='👩‍👩‍👧‍👦',text='甲'+emoji+'乙\ue000丙';
  const moved=moveInline(text,1,1+emoji.length,text.length);
  assert.equal(moved.text,'甲乙\ue000丙'+emoji);assert.equal(moved.text.slice(moved.start,moved.end),emoji);
  assert.equal(moveInline(moved.text,moved.start,moved.end,0).text,emoji+'甲乙\ue000丙');
  assert.equal(moveInline(text,1,1+emoji.length,2).text,text);
  assert.deepEqual(graphemes('A'+emoji+'🇨🇳'),['A',emoji,'🇨🇳']);
  assert.deepEqual(wrapText(emoji+emoji,10,()=>20),[emoji,emoji]);
});
test('备份往返保留行内内置贴纸、自定义图片、Unicode 表情与书页贴纸',async()=>{
  const diary={...initialDiary(),body:'今天\ue000开心🥰\ue001',inlineStickers:{'\ue000':'chat-hug','\ue001':'asset:custom'},stickers:[{id:'emoji-page',kind:'emoji:🥰',page:0,x:.4,y:.5,size:70,rotation:0}]};
  const blob=await pack(diary,[{id:'custom',name:'my-sticker.png',type:'image',role:'sticker',blob:new Blob(['test png'],{type:'image/png'})}]);
  const restored=await unpack(new File([blob],'diary.zip'));
  assert.equal(restored.diary.body,diary.body);assert.deepEqual(restored.diary.inlineStickers,diary.inlineStickers);
  assert.equal(restored.diary.stickers[0].kind,'emoji:🥰');assert.equal(await restored.assets[0].blob.text(),'test png');
});
