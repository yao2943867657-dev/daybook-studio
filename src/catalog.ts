/** Original, redistributable hand-drawn sticker artwork. MIT, Daybook Studio contributors. */
export interface CatalogSticker { id: string; name: string; category: string; tags: string[]; svg: string }
const ink = '#52494c';
const palette = { rose:'#f3a6ba', blue:'#a7d8ed', green:'#acd5aa', yellow:'#ffe18c', cream:'#fff3cf', lilac:'#d6b9ef' };
const p = (d:string,fill='none',extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (cx:number,cy:number,rx:number,ry:number,fill:string,extra='') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const circle = (x:number,y:number,r:number,fill:string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const star = (x:number,y:number,s=1,color=palette.yellow) => `<g transform="translate(${x} ${y}) scale(${s})">${p('M0-12 4-4 13-2 6 5 7 14 0 10-8 14-7 5-14-2-4-4Z',color)}</g>`;
const heart = (x:number,y:number,s=1,color=palette.rose) => `<g transform="translate(${x} ${y}) scale(${s})">${p('M0 13C-32-6-11-28 0-13 11-28 32-6 0 13Z',color)}</g>`;
const blush = () => `${ellipse(29,57,7,3,'#edaeaa','stroke="none" opacity=".65"')}${ellipse(70,57,7,3,'#edaeaa','stroke="none" opacity=".65"')}`;
function expression(kind:string):string {
  const eyes = kind==='sleepy' ? p('M31 48q7 5 13 0m12 0q7 5 13 0') : kind==='angry' ? p('m30 45 12 4m16 0 12-4M34 53h3m26 0h3') : kind==='sad' ? p('M31 48q6-6 12 0m14 0q6-6 12 0') : kind==='love' ? `${heart(36,49,.3,'#d58f91')}${heart(64,49,.3,'#d58f91')}` : kind==='happy' || kind==='cheer' ? p('M31 50q6-9 12 0m14 0q6-9 12 0') : `${ellipse(36,49,2,3,ink)}${ellipse(64,49,2,3,ink)}`;
  const mouth = kind==='angry'?p('M43 65q7-6 14 0'):kind==='sad'?p('M44 65q6-5 12 0'):kind==='sleepy'?p('M45 65h10'):kind==='happy'||kind==='cheer'?p('M39 59q11 23 22 0Z','#cd8d86'):p('M42 62q8 7 16 0');
  const extra = kind==='sad'?p('M70 54q-10 13 1 12 9-2-1-12Z',palette.blue):kind==='angry'?p('M78 22v10m-5-5h10'):kind==='cheer'?`${star(15,27,.38)}${p('m11 48-5-1m79-6 6-3')}`:kind==='sleepy'?p('m78 24 10 1-11 11h10m-3-24 8 1-8 8h7'):kind==='love'?heart(84,26,.36):'';
  return eyes+blush()+mouth+extra;
}
function face(kind:string,animal:'girl'|'cat'|'rabbit'='girl'):string {
  if(animal==='cat')return `${p('M19 43 18 17 37 30Q50 24 64 30L82 16 80 44Q91 79 52 82 9 83 19 43Z',palette.cream)}${p('m20 18 6 22 10-9m45-13-8 22-9-9',palette.rose,'stroke-width="1.4"')}${expression(kind)}${p('m21 58-13-3m14 9-14 2m70-9 14-4m-14 12 15 1')}`;
  if(animal==='rabbit')return `${ellipse(33,26,9,24,'#fff8ee','transform="rotate(-10 33 26)"')}${ellipse(66,26,9,24,'#fff8ee','transform="rotate(10 66 26)"')}${ellipse(33,24,3,14,palette.rose,'stroke="none"')}${ellipse(66,24,3,14,palette.rose,'stroke="none"')}${ellipse(50,57,33,29,'#fff8ee')}${expression(kind)}`;
  return `${p('M18 52Q8 23 29 15 40 4 56 13 80 13 84 34L82 70 68 75 28 74 16 66Z','#876952')}${ellipse(50,48,30,32,'#fae5cf')}${p('M20 42Q23 13 50 19 76 18 79 39 55 39 51 23 44 40 20 42Z','#876952')}${p('M26 77q24-12 47 0l3 13H21Z',palette.blue)}${expression(kind)}`;
}

type Animal='cat'|'bunny'|'puppy'|'rice'|'bear';
/** Original five-character cast. Shapes, colours and poses are drawn here, never traced from IP art. */
function reactionArt(animal:Animal,emotion:string,pose='wave',caption=''):string {
  const fur={cat:'#ffddba',bunny:'#fff9fc',puppy:'#e6c8ad',rice:'#fffef7',bear:'#bba7dd'}[animal];
  const lower=caption?70:83;
  const body=animal==='rice'?p(`M23 56Q18 42 32 30 46 9 58 29 81 37 78 58L76 ${lower-5}Q53 ${lower+8} 25 ${lower-3}Z`,fur):`${ellipse(50,lower-13,22,19,fur)}${ellipse(40,lower,10,5,fur)}${ellipse(63,lower,10,5,fur)}`;
  const head=animal==='cat'?`${p('M22 40 20 14 37 25Q50 20 65 25L80 13 79 42Q84 65 51 66 17 65 22 40Z',fur)}${p('m24 18 4 17 8-8m39-9-4 17-8-8','#f8a8bd','stroke-width="1"')}${p('m46 24-1 7m8-7 1 7','#eebf91','stroke-width="2.4"')}`:animal==='bunny'?`${p('M28 31Q13 1 26 3 38 5 40 26m21 0Q61-1 73 3 84 9 71 33',fur)}${p('M28 9q-2 10 6 18m35-18q3 7-4 17','none','stroke="#f7bfd5" stroke-width="4"')}${ellipse(50,43,29,24,fur)}`:animal==='puppy'?`${p('M28 26Q8 14 13 45q3 12 16 4m42-24q21-11 17 18-2 14-16 9','#b58d72')}${p('M23 37Q24 18 48 20 76 17 79 39 84 66 51 67 18 64 23 37Z',fur)}${ellipse(53,51,15,12,'#fff4e5')}`:animal==='bear'?`${circle(27,25,11,fur)}${circle(73,25,11,fur)}${circle(27,25,5,'#dac8ed')}${circle(73,25,5,'#dac8ed')}${ellipse(50,43,30,25,fur)}${ellipse(50,51,14,10,'#efe5f7')}`:'';
  const eyes=emotion==='joy'||emotion==='cheer'?p('M33 42q5-8 10 0m14 0q5-8 10 0','none','stroke-width="2.6"'):emotion==='sad'?`${ellipse(38,43,3.4,4.4,ink)}${ellipse(62,43,3.4,4.4,ink)}${p('M34 36q5-3 10 0m12 0q5-3 10 0')}${ellipse(32,55,4,7,'#8ed3f2','stroke="none"')}${ellipse(69,55,4,7,'#8ed3f2','stroke="none"')}`:emotion==='tired'||emotion==='calm'?p('m33 44 9 1m16 0 9-1','none','stroke-width="2.5"'):emotion==='angry'?`${p('m32 35 11 5m14 0 11-5','none','stroke-width="2.5"')}${circle(38,44,2.5,ink)}${circle(62,44,2.5,ink)}`:emotion==='surprise'?`${ellipse(38,42,4,5.2,ink)}${ellipse(62,42,4,5.2,ink)}${circle(39,40,1.2,'#fff')}${circle(63,40,1.2,'#fff')}`:emotion==='love'?`${heart(38,42,.28,'#e988ac')}${heart(62,42,.28,'#e988ac')}`: `${ellipse(38,42,2.8,3.5,ink)}${ellipse(62,42,2.8,3.5,ink)}${circle(39,41,1,'white')}${circle(63,41,1,'white')}`;
  const mouth=emotion==='joy'||emotion==='cheer'?`${p('M43 51q7 15 14 0Z','#df8da2')}${p('M47 57q4-2 7 0','none','stroke="#f9b6bd" stroke-width="2"')}`:emotion==='surprise'?ellipse(50,54,4,5,'#d993a8'):emotion==='sad'?p('M45 55q5-5 10 0'):emotion==='angry'?p('M44 56q6-6 12 0'):emotion==='tired'?p('M46 54h8'):p('M43 52q3 7 7 1 4 6 8-1');
  const cheeks=`${ellipse(28,51,5.5,3,'#f3a9ba','stroke="none" opacity=".65"')}${ellipse(72,51,5.5,3,'#f3a9ba','stroke="none" opacity=".65"')}`;
  const whiskers=animal==='cat'?p('m26 48-8-2m8 7-8 1m56-6 8-2m-8 7 8 1','none','stroke-width="1.1"'):'';
  const arm=pose==='hug'?`${p('M29 61q22-10 27 4m16-4q-22-10-27 4','none','stroke-width="9" stroke="'+fur+'"')}${p('M30 59q10-4 18 3m22-3q-9-4-17 3')}`:pose==='heart'?`${heart(50,66,.68,'#f7a4c1')}${ellipse(32,64,7,5,fur,'transform="rotate(-25 32 64)"')}${ellipse(69,64,7,5,fur,'transform="rotate(25 69 64)"')}`:pose==='sleep'?`${p('M25 67q25 8 52-1v12H23Z','#bcdff0')}${p('m79 15 9 1-9 9h9m-4-19 7 1-7 7h7','none','stroke="#9ba0c8" stroke-width="1.6"')}`:pose==='cup'?`${p('M37 58h28l-3 20H40Z','#a7d8ed')}${p('M65 62q15-1 9 9-2 3-10 2M45 54q-4-5 1-9m9 9q-4-5 1-9')}${ellipse(30,65,8,5,fur)}${ellipse(72,65,7,5,fur)}`:pose==='food'?`${p('M31 62h40l-7 15H38Z','#f5b7c9')}${ellipse(51,61,20,5,'#fff4da')}${p('m38 57 5-5 5 4 6-5 9 7','#fcf8e6','stroke="none"')}${p('m74 56 8-18m-4 20 9-18','none','stroke-width="2"')}`:pose==='flower'?`${p('M77 62v18','none','stroke="#7cae8a" stroke-width="2.5"')}${[0,72,144,216,288].map(a=>`<ellipse cx="77" cy="48" rx="5" ry="9" transform="rotate(${a} 77 55)" fill="#ffc7dd"/>`).join('')}${circle(77,55,4,'#ffdf70')}${p('M27 61q-10 7-10 0',fur)}${ellipse(72,70,9,5,fur)}`:pose==='run'?`${p('M26 57 15 50m59 8 12-9','none','stroke="'+fur+'" stroke-width="10"')}${p('M12 63h-7m9 8H8m72 0 12 3')}`:pose==='sparkle'?`${star(16,24,.38,'#ffdf70')}${star(84,35,.34,'#a7d8ed')}${p('m24 60-8-7m57 7 8-7','none','stroke="'+fur+'" stroke-width="10"')}`:`${p('M26 58Q8 63 16 48m60 12q16 7 13-7','none','stroke="'+fur+'" stroke-width="9"')}${p('m11 40-5-3m10 0-1-6')}`;
  const extra=emotion==='angry'?p('M79 17v7m-4-3h8','none','stroke="#e990b0" stroke-width="2.2"'):emotion==='love'?heart(84,23,.28,'#f3a6ba'):emotion==='cheer'?`${star(16,25,.3,'#ffdb6b')}${star(85,21,.25,'#ffdb6b')}`:emotion==='surprise'?p('M81 17v10m0 5v1','none','stroke="#c6a4e5" stroke-width="3"'):'';
  const label=caption?`<text x="50" y="94" text-anchor="middle" font-size="${caption.length>3?12:14}" font-weight="750" font-family="'Microsoft YaHei','PingFang SC',sans-serif" fill="#655066" stroke="#fff" stroke-width="3.8" paint-order="stroke">${caption}</text>`:'';
  return `<g stroke-width="1.8">${body}${head}${eyes}${cheeks}${mouth}${whiskers}${arm}${extra}</g>${label}`;
}

const chatReactions:[string,string,Animal,string,string,string[]][]=[
  ['chat-yay','好耶','cat','joy','sparkle',['开心','好耶','撒花','yes','happy']],
  ['chat-ok','收到','puppy','content','wave',['收到','好滴','好的','ok','收到啦']],
  ['chat-love','贴贴','bunny','love','heart',['贴贴','喜欢','亲亲','爱你','love']],
  ['chat-hug','抱抱','bear','content','hug',['抱抱','安慰','拥抱','hug']],
  ['chat-lazy','摆烂','rice','calm','sleep',['摆烂','躺平','休息','摸鱼','lazy']],
  ['chat-sad','委屈','bunny','sad','hug',['委屈','哭哭','难过','sad']],
  ['chat-night','晚安','cat','tired','sleep',['晚安','困困','睡觉','night']],
  ['chat-morning','早安','puppy','joy','cup',['早安','早上好','咖啡','morning']],
  ['chat-thanks','谢谢','bear','joy','flower',['谢谢','感谢','thanks']],
  ['chat-heart','爱你','rice','love','heart',['爱你','喜欢','比心','love']],
  ['chat-cheer','加油','bunny','cheer','sparkle',['加油','鼓励','打气','cheer']],
  ['chat-tired','累了','puppy','tired','sleep',['累了','疲惫','下班','tired']],
  ['chat-speechless','无语','cat','calm','hug',['无语','沉默','呆住','speechless']],
  ['chat-wow','震惊','rice','surprise','wave',['震惊','惊讶','哇','wow']],
  ['chat-angry','不气','bear','angry','cup',['生气','不气','奶凶','angry']],
  ['chat-miss','想你','bunny','love','flower',['想你','想念','心动','miss']],
  ['chat-confetti','撒花','puppy','cheer','sparkle',['撒花','庆祝','开心','party']],
  ['chat-water','喝水','rice','content','cup',['喝水','休息','健康','water']],
  ['chat-food','干饭','cat','joy','food',['干饭','吃饭','好吃','food']],
  ['chat-idle','摸鱼','bear','calm','cup',['摸鱼','上班','放空','break']],
  ['chat-busy','忙碌','bunny','surprise','run',['忙碌','在忙','打工','busy']],
  ['chat-go','冲鸭','puppy','cheer','run',['冲鸭','出发','努力','go']],
  ['chat-little-heart','比心','cat','love','heart',['比心','爱心','心心','heart']],
  ['chat-sticker','贴一下','rice','joy','flower',['贴纸','手账','贴一下','sticker']],
  ['chat-cry','呜呜','puppy','sad','hug',['呜呜','哭哭','难过','cry']],
  ['chat-fine','好滴','bunny','content','wave',['好滴','好哒','好的','ok']],
  ['chat-happy','开心','bear','joy','sparkle',['开心','高兴','快乐','happy']],
  ['chat-can','我可以','rice','cheer','sparkle',['我可以','自信','加油','yes']],
  ['chat-bye','溜了','cat','content','run',['溜了','再见','拜拜','bye']],
  ['chat-please','求抱抱','bunny','sad','hug',['求抱抱','安慰','委屈','please']],
  ['chat-calm','放空','rice','calm','sleep',['放空','平静','自在','calm']],
  ['chat-birthday','生日快乐','bear','joy','flower',['生日','生日快乐','庆祝','birthday']],
];
const definitions: [string,string,string,string[],string][] = [
  ['sun','小太阳','日常',['阳光','晴天','sun','weather'],`${circle(50,51,22,palette.yellow)}${p('M50 14v9m0 57v8M13 50h9m56 0h9M23 23l7 7m41 41 7 7m0-55-7 7M29 71l-7 7')}${p('M41 50h1m16 0h1m-17 9q8 8 16 0')}`],
  ['cloud','云朵','日常',['天气','白云','cloud'],`${p('M22 66C1 64 8 37 27 39 26 12 67 13 70 38 91 29 103 64 77 67Z','#f9f8ef')}${p('M37 51h1m22 0h1m-19 8q6 5 11 0')}${blush()}`],
  ['rainbow','小彩虹','日常',['彩虹','雨后','rainbow'],`${p('M16 65C16 10 84 10 84 65',palette.rose,'stroke-width="2"')}${p('M28 64C28 28 72 28 72 64',palette.yellow)}${p('M40 64C40 44 60 44 60 64','#c7d9c1')}${p('M9 68q1-14 12-10 7-13 17 2 13-1 12 11H9Z','#fff9ec')}${p('M59 70q-3-12 9-12 8-13 17 0 12-1 12 13Z','#fff9ec')}`],
  ['moon','月亮晚安','日常',['晚安','夜晚','moon','night'],`${p('M66 15C19 17 15 73 62 81 40 68 34 42 66 15Z',palette.yellow)}${star(77,33,.48)}${star(82,66,.25)}${p('M44 53q6 5 10 0')}`],
  ['coffee','咖啡杯','食物',['咖啡','早餐','coffee','drink'],`${p('M23 39h48l-5 38q-18 12-38-1Z',palette.cream)}${p('M71 44q25-2 17 19-3 7-18 6')}${p('M16 84q36 7 65-1M33 29q-9-10 1-17m15 17q-8-10 1-17m15 16q-7-8 0-15')}${heart(47,58,.4,palette.rose)}`],
  ['tea','下午茶','食物',['茶','杯子','tea','drink'],`${p('M16 40q33-9 63 0l-7 33q-21 17-47 0Z','#d7e4cd')}${p('M79 45q20 0 13 16-3 7-17 6M23 38q27 9 52 0M12 84q40 8 77-2')}${p('M51 40v20l12 7v16H40V67l11-7',palette.yellow,'stroke-width="1.5"')}`],
  ['bread','可颂面包','食物',['面包','早餐','croissant','bread'],`${p('M13 70Q5 29 35 35 50 8 66 34 95 28 88 70L72 80 58 67H41L25 81Z','#deb17d')}${p('M35 35q-7 15 6 32m25-33q9 15-8 33M21 46l9 4m-13 7 10 4m45-14 10-4m-8 17 10-4')}`],
  ['cake','草莓蛋糕','食物',['蛋糕','生日','cake','dessert'],`${p('m15 48 41-25 32 29-3 29q-34 11-68 0Z',palette.cream)}${p('m15 48 40-22 33 26q-40 16-73-4Z',palette.rose)}${p('M18 62q33 12 68-1m-68 9q34 12 68 0','#e6a7a1')}${p('M53 17q20-17 20 5-3 17-13 14-11-5-7-19Z','#ca8077')}${p('M57 18q-8-9-1-10m5 9q9-14 12-8')}`],
  ['strawberry','草莓','食物',['水果','草莓','strawberry','fruit'],`${p('M24 35Q50 17 78 35 87 53 55 85 30 86 22 49Z','#eaa5a0')}${p('m48 29-17-15 19 5 5-14 6 16 18-5-16 18Z','#a9bd91')}${p('M34 45l2 4m16-7 1 5m15 0-1 4M39 60l2 4m16-6 1 5m-9 9 1 4','#f9ecc9','stroke="#f9ecc9"')}`],
  ['cherry','一对樱桃','食物',['樱桃','水果','cherry','fruit'],`${p('M34 61Q57 44 56 12 66 29 74 56')}${p('M56 14q-23-7-30 8 20 10 30-8Z',palette.green)}${circle(31,70,17,'#dba09d')}${circle(73,68,17,'#cf8d8b')}${p('M22 64q1-6 7-6m35 4q4-5 10-3','none','stroke="#fff0dd" stroke-width="4"')}`],
  ['icecream','冰淇淋','食物',['夏天','甜筒','icecream','summer'],`${p('M31 52h40L52 92Z','#dfbc83')}${p('m37 60 24 22m-18-26 21 18M39 76l23-19m-17 28 13-17')}${p('M24 50q-8-15 5-20 0-17 19-15 17-12 23 8 17 1 13 21 7 13-6 15-7 6-12-3-10 9-15-1-9 8-15-1-13 3-12-4Z',palette.rose)}`],
  ['flower','小雏菊','植物',['花','小花','flower','daisy'],`${p('M51 46q7 23-5 47M49 76q-24-1-24-19 22-1 24 19m2-16q21-1 25-18-24 1-25 18',palette.green)}${[0,60,120,180,240,300].map(a=>`<ellipse cx="50" cy="23" rx="9" ry="17" transform="rotate(${a} 50 39)" fill="#fff6dc"/>`).join('')}${circle(50,39,10,palette.yellow)}`],
  ['tulip','粉色郁金香','植物',['花','郁金香','tulip','flower'],`${p('M51 46v47M50 86Q20 78 23 57q26 9 27 29m2-12Q79 66 78 46q-24 9-26 28',palette.green)}${p('M25 18 40 28 50 11 61 27 76 16Q79 58 51 58 24 55 25 18Z',palette.rose)}${p('M40 29q12 12 9 26m12-28q-12 11-10 27')}`],
  ['bouquet','一束小花','植物',['花束','鲜花','bouquet','flower'],`${p('M21 49 77 47 61 91 45 91Z','#e6ccb0')}${p('m36 47 16 36 15-36M25 56l46 7m-34 9 29 5')}${[[-2,0],[22,-6],[43,3]].map(([x,y])=>`<g transform="translate(${x} ${y})">${p('M29 38v19','#9caf89')}${[0,72,144,216,288].map(a=>`<ellipse cx="29" cy="22" rx="7" ry="11" transform="rotate(${a} 29 30)" fill="${x===22?palette.rose:palette.cream}"/>`).join('')}${circle(29,30,5,palette.yellow)}</g>`).join('')}${p('M42 78q-28-10-15 7 6 4 19-1 21-13 21-1-5 11-21 1m0 1-8 12m8-12 8 12',palette.rose)}`],
  ['leaf','一片叶子','植物',['叶子','植物','leaf','nature'],`${p('M24 84Q4 31 82 14 87 78 24 84Z',palette.green)}${p('M18 93 68 30M32 74l-3-21m15 5 22 1M45 58l-1-19m12 7 17-2')}`],
  ['sprout','小芽','植物',['发芽','成长','sprout','growth'],`${p('M51 79V43M50 53Q16 54 18 24q35-4 32 29m2-9Q83 41 83 14q-32 0-31 30',palette.green)}${p('M24 86q25-12 51 0m-43 7q19-8 37-1')}`],
  ['plant','窗边盆栽','植物',['植物','盆栽','plant','home'],`${p('M31 57h40l-7 34H37Z','#d8ad94')}${p('M27 57h48v9H27Z','#e5bea2')}${p('M50 57V26m-1 19Q17 43 23 20q28 1 26 25m2-8Q79 35 76 11q-25 2-25 26',palette.green)}${p('m42 72 2 12m15-12-2 12')}`],
  ['mushroom','小蘑菇','植物',['森林','蘑菇','mushroom','forest'],`${p('M40 46h20l7 41q-18 12-32 0Z',palette.cream)}${p('M10 52Q18 3 51 13 81 9 91 53q-37 10-81-1Z','#c99380')}${circle(34,33,7,'#f7e7ca')}${circle(62,28,6,'#f7e7ca')}${circle(74,45,4,'#f7e7ca')}${p('M45 70h1m12 0h1m-12 9q5 4 9 0')}`],
  ['tree','一棵树','植物',['树','公园','tree','park'],`${p('M43 54h15l4 39H38Z','#bd9f7d')}${p('M19 53Q3 35 24 29 16 7 42 14 53-4 69 14 95 11 84 33 105 54 79 64 43 75 19 53Z',palette.green)}${p('M50 55v27m0-16 15-12m-15 20-13-9')}`],
  ['heart','手绘爱心','日常',['爱','喜欢','heart','love'],`${heart(50,53,1.7)}${p('M31 29q-9 1-11 10','none','stroke="#fff3e8" stroke-width="5"')}${p('m9 24-5-5m82 8 8-3m-8 40 7 4')}`],
  ['envelope','一封信','文具',['信','想念','envelope','letter'],`${p('M12 27 87 24 90 78 11 81Z','#efe5cd')}${p('m13 29 39 28 33-31M13 79l29-30m47 28L62 50')}${heart(51,56,.54,palette.rose)}${p('m18 17 9-4m48 72 12 1')}`],
  ['book','翻开的书','文具',['书','阅读','日记','book','read'],`${p('M50 25Q29 13 9 22v56q24-9 41 4 19-13 41-5V20Q70 13 50 25Z','#f7edda')}${p('M50 26v55M17 33l23 1M17 44l23 1M17 55l23 1m20-22 23-3m-23 14 23-3m-23 15 23-3')}${p('M65 23v37l7-4 6 2V21',palette.rose)}`],
  ['notebook','小笔记本','文具',['手账','本子','notebook','diary'],`${p('m23 12 56 3-3 74-56-2Z',palette.blue)}${p('M30 13 27 87M37 32l26 1m-26 9 22 1m-22 9 25 1')}${p('M18 22h13M18 39h13M17 56h13M17 73h13')}${heart(52,69,.6,'#f1c5b1')}`],
  ['pencil','彩色铅笔','文具',['铅笔','写字','pencil','write'],`${p('M24 80 30 58 67 13q6-8 14-1l6 7q6 6-1 12L48 77Z',palette.yellow)}${p('m30 58 18 19m-18-19 8 1 1 9 9 9m-24 3 10-4-7-6Z','#c3a381')}${p('m39 58 34-39m-7-4 17 15')}${p('m68 12 8-6q6-4 12 3l4 6q3 5-1 9l-5 5Z',palette.rose)}`],
  ['scissors','手工剪刀','文具',['剪刀','手作','scissors','craft'],`${ellipse(29,74,13,17,palette.rose,'transform="rotate(25 29 74)"')}${ellipse(65,76,13,17,palette.blue,'transform="rotate(-25 65 76)"')}${p('m35 60 30-48Q61 42 48 60m10 2L29 13q6 28 19 47','#e5e5d9')}${circle(48,59,4,'#c4bba8')}`],
  ['tape','格纹胶带','文具',['胶带','拼贴','tape','washi'],`${p('m8 27 82-5-4 49-77 7 5-12-6-7 7-9-5-9Z',palette.blue)}${p('m24 27-2 48m20-50-2 49m20-50-2 49m20-50-2 49M9 44l80-6M9 61l79-7','none','stroke="#f4f4e7" stroke-width="8" opacity=".65"')}`],
  ['bow','蝴蝶结','文具',['蝴蝶结','丝带','bow','ribbon'],`${p('M45 44Q9 12 10 42 5 75 45 57m10-13q38-31 35 0 7 31-35 14',palette.rose)}${p('M43 51 24 88l19-7 7 9 5-35m1-1 24 35-3-18 12 5-28-29',palette.rose)}${ellipse(50,51,9,12,'#d79b94')}${p('m17 42 22 8m23 0 22-6')}`],
  ['paperclip','星星回形针','文具',['夹子','回形针','paperclip','clip'],`${p('M31 78 69 29Q86 7 65 7 57 6 48 18L13 63Q-2 90 23 94q10 2 19-10l35-44q11-16-1-19-6-2-12 7L31 70','none','stroke="#ae946b" stroke-width="5"')}${star(66,16,.6,'#e6cc8c')}`],
  ['camera','胶片相机','旅行',['拍照','相机','camera','photo'],`${p('M12 31h19l8-12h23l8 12h19v48H12Z',palette.blue)}${circle(52,55,19,'#fff1d6')}${circle(52,55,12,'#9bacae')}${circle(57,50,4,'#e9eee1')}${p('M19 41h13m40-2h10M23 25h9')}`],
  ['ticket','旅行票根','旅行',['车票','票据','ticket','travel'],`${p('M11 25h78v17q-15 7 0 15v18H11V58q14-8 0-16Z','#e8c89c')}${p('M65 28v43','none','stroke-dasharray="3 5"')}${p('M23 40h31m-31 12h21m-21 11h29')}${star(76,49,.38,'#f8e8bb')}`],
  ['plane','纸飞机','旅行',['出发','旅行','plane','fly'],`${p('M8 39 91 11 61 88 44 57 25 70 28 48Z',palette.blue)}${p('m29 48 62-37-47 46 17 31m-17-31-19 13 6-17')}${p('M12 79q-5 13 11 14 14 0 12-13','none','stroke-dasharray="3 5"')}`],
  ['suitcase','旅行箱','旅行',['行李','旅行','suitcase','trip'],`${p('M39 21v-9h22v9M26 23h49q9 0 9 10v47H17V34q0-11 9-11Z','#c9ac8b')}${p('M29 24v55m42-55v55m-54-24h67M25 82v8m51-8v8')}${p('M39 42h22v20H39Z','#e7d5b7')}${heart(50,54,.28,palette.rose)}`],
  ['map','折叠地图','旅行',['地图','远方','map','trip'],`${p('m9 23 25-8 32 12 24-11-2 63-25 10-31-13-23 9Z','#e6e4c5')}${p('m34 15-2 61m34-49-3 62M14 48l17-8 32 16 22-14','none','stroke="#97b59b" stroke-width="8"')}${p('M57 43q-17-21 0-27 18 1 0 27Z',palette.rose)}${circle(57,27,4,'#fff4db')}`],
  ['bicycle','小自行车','旅行',['骑车','周末','bicycle','bike'],`${circle(23,68,17,'none')}${circle(78,68,17,'none')}${p('m23 68 18-30 15 30H23l22-21h22l11 21M36 35h15m18 12-6-24h15','none','stroke="#9aad8c" stroke-width="4"')}${p('M39 31h16','none','stroke-width="5"')}${p('M73 18q12-4 14 5')}`],
  ['house','小房子','日常',['家','房子','house','home'],`${p('M20 44h61v44H20Z','#f2dbba')}${p('M9 45 50 12 92 45Z','#c89785')}${p('M43 88V58h17v30','#b5c9c4')}${p('M28 54h11v14H28Zm39 0h9v14h-9Z','#fff8df')}${p('M20 44h61m-52-13V15h10v8')}`],
  ['umbrella','雨天小伞','日常',['雨天','伞','umbrella','rain'],`${p('M8 52Q11 14 50 14 88 18 92 52q-14-13-28 0-13-13-27 0-15-14-29 0Z',palette.lilac)}${p('M50 10v4m0 39v27q0 18-13 11-7-4-4-11M50 16Q36 25 37 52m13-36q15 17 14 36')}${p('m15 71-3 6m71-10-3 6m-60 9-3 7','none','stroke="#a7c7d5" stroke-width="3"')}`],
  ['bag','粉色小包','日常',['购物','包包','bag','shopping'],`${p('M25 34h52l8 52q-36 8-68 0Z',palette.rose)}${p('M34 41V25q0-28 25-14 10 5 7 30M26 50h49')}${circle(36,40,3,'#d6bb75')}${circle(66,40,3,'#d6bb75')}${p('M40 66h1m18 0h1m-18 9q8 6 15-1')}`],
  ['coins','小金币','日常',['钱','金币','存钱','coin','money'],`${ellipse(31,75,22,9,palette.yellow)}${p('M9 62v13q22 14 44 0V62',palette.yellow)}${ellipse(31,62,22,9,'#f8e5ab')}${p('M53 50v28q15 11 36 0V50',palette.yellow)}${ellipse(71,50,18,8,'#f8e5ab')}${p('M53 61q17 10 36 0m-35 9q17 10 35 0M20 64l3 9m-5-18 3 3')}${star(32,29,.65,'#efd688')}`],
  ['gift','小礼物','日常',['礼物','惊喜','gift','surprise'],`${p('M20 43h61v43H20Z',palette.blue)}${p('M14 33h73v16H14Z','#d2e1e3')}${p('M44 34h14v52H44Z',palette.rose)}${p('M49 31Q12 8 30 7q21-6 22 26 1-35 22-26 17 7-22 26',palette.rose)}${p('m48 34-17 23m23-23 18 22')}`],
  ['music','小小音乐','日常',['音乐','歌','music','song'],`${p('M38 70V23l44-10v49M39 31l43-10','none','stroke="#8b9d96" stroke-width="5"')}${ellipse(27,74,13,9,palette.blue,'transform="rotate(-20 27 74)"')}${ellipse(71,66,13,9,palette.rose,'transform="rotate(-20 71 66)"')}${star(15,30,.4)}${p('m21 43-5 9m72 32 6 4')}`],
  ['sparkles','闪闪发光','日常',['闪光','星星','sparkle','star'],`${star(41,46,1.5)}${star(79,21,.65,palette.rose)}${star(78,76,.45,palette.blue)}${p('M10 13v12m-6-6h12m1 53v12m-6-6h12m66-25h8')}`],
  ['paw','小爪印','日常',['宠物','爪印','paw','pet'],`${ellipse(50,66,24,19,'#d6b394')}${ellipse(24,39,9,13,'#e8c5aa','transform="rotate(-28 24 39)"')}${ellipse(43,26,9,13,'#e8c5aa')}${ellipse(65,28,9,13,'#e8c5aa')}${ellipse(81,44,9,13,'#e8c5aa','transform="rotate(28 81 44)"')}${heart(50,69,.52,'#f6dfcb')}`],
  ['polaroid','拍立得','文具',['照片','相纸','polaroid','photo'],`${p('m19 10 66 7-8 76-66-8Z','#fff9e9')}${p('m25 20 49 5-5 45-49-5Z',palette.blue)}${p('m20 64 18-25 14 17 10-9 9 23Z',palette.green)}${circle(61,36,7,palette.yellow)}${heart(46,81,.28,palette.rose)}`],
  ['filmstrip','胶片记忆','文具',['电影','胶片','film','cinema'],`${p('M12 16h76v69H12Z','#8a8b7d')}${p('M26 24h48v52H26Z','#d7d9c7')}${[23,39,55,71].map(y=>`${p(`M16 ${y}h6v7h-6Z`,'#f7efd9')}${p(`M78 ${y}h6v7h-6Z`,'#f7efd9')}`).join('')}${p('m29 64 16-19 10 9 15-25v43H29Z','#aabb9c')}${circle(40,36,7,palette.yellow)}`],
  ['cat-happy','猫猫开心','表情',['开心','猫','笑','cat','happy'],face('happy','cat')],
  ['cat-love','猫猫心动','表情',['喜欢','心动','猫','cat','love'],face('love','cat')],
  ['cat-sad','猫猫委屈','表情',['难过','委屈','猫','cat','sad'],face('sad','cat')],
  ['cat-angry','猫猫生气','表情',['生气','猫','cat','angry'],face('angry','cat')],
  ['cat-sleepy','猫猫困困','表情',['疲惫','困','猫','cat','sleepy'],face('sleepy','cat')],
  ['rabbit-cheer','兔兔加油','表情',['加油','鼓励','兔','rabbit','cheer'],face('cheer','rabbit')],
  ['rabbit-love','兔兔想你','表情',['想念','想你','兔','rabbit','love'],face('love','rabbit')],
  ['rabbit-calm','兔兔放空','表情',['平静','放空','兔','rabbit','calm'],face('calm','rabbit')],
  ['mood-happy','开心','心情',['开心','快乐','happy','mood'],face('happy')],
  ['mood-content','满足','心情',['满足','幸福','content','mood'],face('content')],
  ['mood-cheer','加油','心情',['加油','元气','cheer','mood'],face('cheer')],
  ['mood-calm','平静','心情',['平静','自在','calm','mood'],face('calm')],
  ['mood-tired','疲惫','心情',['疲惫','累','tired','mood'],face('sleepy')],
  ['mood-sad','难过','心情',['难过','需要抱抱','sad','mood'],face('sad')],
  ['mood-angry','生气','心情',['生气','不开心','angry','mood'],face('angry')],
  ['mood-miss','想念','心情',['想念','想你','miss','mood'],face('love')],
];
function wrap(id:string,art:string):string {
  // White sticker edge and subtle ink misregistration use only local SVG primitives.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs><filter id="edge-${id}" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="edge"/><feFlood flood-color="#fffdf5"/><feComposite in2="edge" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#edge-${id})">${art}</g></svg>`;
}
const refreshed:Record<string,string>={
  'cat-happy':reactionArt('cat','joy','sparkle'), 'cat-love':reactionArt('cat','love','heart'),
  'cat-sad':reactionArt('cat','sad','hug'), 'cat-angry':reactionArt('cat','angry','wave'), 'cat-sleepy':reactionArt('cat','tired','sleep'),
  'rabbit-cheer':reactionArt('bunny','cheer','sparkle'), 'rabbit-love':reactionArt('bunny','love','heart'), 'rabbit-calm':reactionArt('bunny','calm','hug'),
  'mood-happy':reactionArt('cat','joy','sparkle'), 'mood-content':reactionArt('rice','content','flower'),
  'mood-cheer':reactionArt('bunny','cheer','run'), 'mood-calm':reactionArt('bear','calm','cup'),
  'mood-tired':reactionArt('puppy','tired','sleep'), 'mood-sad':reactionArt('bunny','sad','hug'),
  'mood-angry':reactionArt('cat','angry','wave'), 'mood-miss':reactionArt('bear','love','heart'),
};
export const catalog:CatalogSticker[]=[
  ...definitions.map(([id,name,category,tags,art])=>({id,name,category,tags,svg:wrap(id,refreshed[id]??art)})),
  ...chatReactions.map(([id,name,animal,emotion,pose,tags])=>({id,name,category:'聊天',tags:[...tags,'聊天','表情包','软萌',animal],svg:wrap(id,reactionArt(animal,emotion,pose,name))})),
];
/** Curated original packs; popularity research informs the emotional language, not an IP licence. */
export const stickerPacks=[
  {id:'chat',name:'软糯聊天',description:'好耶、抱抱、摆烂，给今天加一点表情。',ids:chatReactions.map(r=>r[0])},
  {id:'mood',name:'今日心情',description:'八种心情，用不同的小动物表达。',ids:Object.keys(refreshed).filter(id=>id.startsWith('mood-'))},
  {id:'scrapbook',name:'手账小物',description:'胶带、花草、咖啡和随手收藏的小东西。',ids:definitions.filter(d=>!['表情','心情'].includes(d[2])).map(d=>d[0])},
];
const lookup=new Map(catalog.map(s=>[s.id,s]));
export const getSticker=(id:string)=>lookup.get(id);
export const moods:{name:string;sticker:string}[]=[
  {name:'开心',sticker:'mood-happy'},{name:'满足',sticker:'mood-content'},{name:'加油',sticker:'mood-cheer'},{name:'平静',sticker:'mood-calm'},
  {name:'疲惫',sticker:'mood-tired'},{name:'难过',sticker:'mood-sad'},{name:'生气',sticker:'mood-angry'},{name:'想念',sticker:'mood-miss'},
];
const oldMoods:Record<string,string>={'小小的幸福':'mood-content','元气满满':'mood-cheer','平静自在':'mood-calm','有点想你':'mood-miss','需要抱抱':'mood-sad','明天会更好':'mood-cheer'};
export function getMoodSticker(name:string):string {return moods.find(m=>m.name===name)?.sticker??oldMoods[name]??'mood-content';}
const images=new Map<string,HTMLImageElement>();
let prepared:Promise<void>|undefined;
export function prepareCatalog():Promise<void>{
  if(prepared)return prepared;
  prepared=Promise.all(catalog.map(s=>new Promise<void>((resolve)=>{
    const img=new Image();const url=URL.createObjectURL(new Blob([s.svg],{type:'image/svg+xml'}));
    img.onload=()=>{images.set(s.id,img);URL.revokeObjectURL(url);resolve();};
    img.onerror=()=>{URL.revokeObjectURL(url);resolve();};
    img.src=url;
  }))).then(()=>undefined);
  return prepared;
}
/** Draws a sticker at its center. Call prepareCatalog once before rendering. */
export function drawSticker(ctx:CanvasRenderingContext2D,kind:string,x:number,y:number,size:number,rotation=0):void {
  const img=images.get(kind);if(!img)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();
}
