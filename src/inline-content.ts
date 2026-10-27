/** One private-use character represents one inline image; original text offsets stay stable. */
export function inlineToken(map:Record<string,string>,kind:string,text=''):string {
  const existing=Object.keys(map).find(k=>map[k]===kind);if(existing)return existing;
  if(Object.keys(map).length>=1000)throw new Error('每篇最多使用 1000 种行内贴纸');
  for(let n=0xe000;n<=0xf8ff;n++){const token=String.fromCharCode(n);if(!map[token]&&!text.includes(token)){map[token]=kind;return token;}}
  throw new Error('这篇日记的行内贴纸已满');
}
export const graphemes=(text:string)=>Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text),s=>s.segment);
export function moveInline(text:string,start:number,end:number,target:number){
  if(start<0||end<=start||end>text.length||target<0||target>text.length)throw new Error('表情移动位置无效');
  if(target>=start&&target<=end)return {text,start,end};
  const item=text.slice(start,end),rest=text.slice(0,start)+text.slice(end),at=target>end?target-item.length:target;
  return {text:rest.slice(0,at)+item+rest.slice(at),start:at,end:at+item.length};
}
export function measureInline(text:string,map:Record<string,string>|undefined,size:number,measure:(text:string)=>number){
  return graphemes(text).reduce((width,char)=>width+(map?.[char]?size:measure(char)),0);
}
