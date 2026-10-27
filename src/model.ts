export type ThemeId = 'sketch' | 'cream' | 'travel' | 'blue' | 'forest' | 'film' | 'chat' | 'pocket';
export type Ratio = 'landscape' | 'portrait';
export type Layout = 'single' | 'duo' | 'trio' | 'wall';
export interface StickerPlacement { id: string; kind: string; page: number; x: number; y: number; size: number; rotation: number }
export interface Diary {
  version: 1; title: string; date: string; body: string; note: string; mood: string;
  theme: ThemeId; ratio: Ratio; seconds: number; fit: 'cover' | 'contain';
  decoration: number; originalAudio: boolean; pageMedia: Record<string, string>;
  stickers: StickerPlacement[];
  layout: Layout; pageSlots: Record<string,string[]>;
}
export interface Entry { id: string; diary: Diary; assets: Asset[]; updatedAt: number }
export interface Asset { id: string; name: string; type: 'image' | 'video'; blob: Blob; duration?: number; role?: 'sticker' }
export interface Theme { id: ThemeId; name: string; hint: string; paper: string; accent: string; cover: string; ink: string }
export const themes: Theme[] = [
  { id: 'sketch', name: '手绘框框', hint: '把小心情，画在字里', paper: '#fffcf2', accent: '#bc806f', cover: '#5f7263', ink: '#343b32' },
  { id: 'cream', name: '奶油日常', hint: '软软的纸，慢慢地写', paper: '#fff7df', accent: '#b39b55', cover: '#b8ba8e', ink: '#4d4939' },
  { id: 'travel', name: '复古旅行', hint: '票根和远方，都收好', paper: '#f1e3c9', accent: '#9b6550', cover: '#785440', ink: '#4c3e32' },
  { id: 'blue', name: '晴蓝活页', hint: '一小片晴天的拼贴', paper: '#f5f8fa', accent: '#7392ac', cover: '#98afbe', ink: '#3c4e59' },
  { id: 'forest', name: '森林纸笺', hint: '听一听，叶子里的风', paper: '#f0f1df', accent: '#6f825b', cover: '#52664b', ink: '#35462f' },
  { id: 'film', name: '电影收藏', hint: '给今天，留一个镜头', paper: '#eceae2', accent: '#847768', cover: '#454b48', ink: '#333c38' },
  { id: 'chat', name: '私信聊天', hint: '像给自己发一封消息', paper: '#f4f4eb', accent: '#798b80', cover: '#8d9e90', ink: '#35463c' },
  { id: 'pocket', name: '口袋日记', hint: '小小一页，也装得下今天', paper: '#fff8ed', accent: '#b98075', cover: '#bb9c94', ink: '#59453f' },
];
export const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const initialDiary = (): Diary => ({
  version: 1, title: '把日子过成喜欢的样子', date: localDate(),
  body: '今天没有什么大事，\n只是和喜欢的人，去公园坐了一会儿。\n\n风吹过树梢，阳光刚刚好。\n买了一束小花，也给自己买了喜欢的面包。\n\n原来那些不起眼的小瞬间，\n也值得认真收藏。',
  note: '今天的小确幸：有阳光，有花，也有你。', mood: '小小的幸福', theme: 'sketch',
  ratio: 'landscape', seconds: 6, fit: 'cover', decoration: 2, originalAudio: false, pageMedia: {}, stickers: [], layout:'trio', pageSlots:{},
});
export interface TextLine { text: string; paragraph: number; first: boolean }
const closing = /^[，。！？、；：）》」』】…,.!?;:]/u;
export function wrapText(text: string, width: number, measure: (s: string) => number): string[] {
  const result: string[] = []; let line = '';
  for (const char of Array.from(text)) {
    if (line && measure(line + char) > width && !closing.test(char)) { result.push(line); line = char; }
    else line += char;
  }
  if (line) result.push(line);
  return result.length ? result : [''];
}
export function paginate(body: string, width: number, maxLines: number, measure: (s: string) => number): TextLine[][] {
  const pages: TextLine[][] = []; let page: TextLine[] = [];
  body.split(/\n+/).filter(p => p.trim()).forEach((p, paragraph) => {
    wrapText(p.trim(), width, measure).forEach((text, i) => {
      if (page.length === maxLines) { pages.push(page); page = []; }
      page.push({ text, paragraph, first: i === 0 });
    });
  });
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
export function validateDiary(input: unknown): Diary {
  if (!input || typeof input !== 'object') throw new Error('工程缺少日记内容');
  const d = input as Record<string, unknown>;
  if (d.version !== 1) throw new Error('暂不支持这个工程版本');
  for (const key of ['title','date','body','note','mood']) if (typeof d[key] !== 'string') throw new Error('工程内容不完整');
  if ((d.body as string).length > 10000) throw new Error('日记最多支持 10000 字');
  const theme = themes.find(t => t.id === d.theme)?.id ?? 'sketch';
  const pageMedia: Record<string, string> = {};
  if (d.pageMedia && typeof d.pageMedia === 'object') for (const [k,v] of Object.entries(d.pageMedia)) if (/^\d+$/.test(k) && Number(k)<500 && typeof v === 'string') pageMedia[k] = v;
  return { version: 1, title: (d.title as string).slice(0,60), date: (d.date as string).slice(0,10),
    body: d.body as string, note: (d.note as string).slice(0,120), mood: (d.mood as string).slice(0,30),
    theme, ratio: d.ratio === 'portrait' ? 'portrait' : 'landscape', seconds: Math.max(3,Math.min(12,Number(d.seconds)||6)),
    fit: d.fit === 'contain' ? 'contain' : 'cover', decoration: Math.max(0,Math.min(2,Number(d.decoration)||0)),
    originalAudio: d.originalAudio === true, pageMedia,
    layout: ['single','duo','trio','wall'].includes(String(d.layout))?d.layout as Layout:'single',
    pageSlots: d.pageSlots&&typeof d.pageSlots==='object'?Object.fromEntries(Object.entries(d.pageSlots).filter(([k,v])=>/^\d+$/.test(k)&&Number(k)<500&&Array.isArray(v)).map(([k,v])=>[k,(v as unknown[]).slice(0,4).map(id=>typeof id==='string'?id:'')])):{},
    stickers: Array.isArray(d.stickers)?d.stickers.slice(0,100).filter((s:any)=>s&&typeof s.id==='string'&&typeof s.kind==='string'&&Number.isFinite(s.x)&&Number.isFinite(s.y)).map((s:any)=>({id:s.id.slice(0,80),kind:s.kind.slice(0,80),page:Number.isFinite(Number(s.page))?Math.max(0,Math.min(499,Math.floor(Number(s.page)||0))):0,x:Math.max(.02,Math.min(.98,s.x)),y:Math.max(.02,Math.min(.98,s.y)),size:Math.max(24,Math.min(150,Number(s.size)||70)),rotation:Math.max(-.6,Math.min(.6,Number(s.rotation)||0))})):[] };
}
export const slotCount=(layout:Layout)=>({single:1,duo:2,trio:3,wall:4}[layout]);
export function sortEntries(entries: Entry[]): Entry[] { return [...entries].sort((a,b)=>b.diary.date.localeCompare(a.diary.date)||b.updatedAt-a.updatedAt); }
export function calendarCells(year:number,month:number): (string|null)[] {
  const first=(new Date(year,month,1).getDay()+6)%7,last=new Date(year,month+1,0).getDate();
  return Array.from({length:42},(_,i)=>i<first||i>=first+last?null:`${year}-${String(month+1).padStart(2,'0')}-${String(i-first+1).padStart(2,'0')}`);
}
