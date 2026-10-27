import {graphemes,moveInline} from './inline-content';
export class RichEditor {
  maxLength=10000;
  private remembered=[0,0];
  selected?:{start:number;end:number};
  moving=false;
  onselect=()=>{};
  constructor(public element:HTMLElement,private image:(token:string)=>{url:string;name:string}|undefined,private change:()=>void){
    element.addEventListener('input',()=>{this.selected=undefined;this.moving=false;this.onselect();});
    document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(s?.anchorNode&&element.contains(s.anchorNode))this.remembered=this.offsets();});
    element.addEventListener('click',e=>{
      const item=(e.target as Element).closest<HTMLElement>('[data-inline]');
      if(item){const start=this.offsetOf(item);this.selected={start,end:start+item.dataset.inline!.length};this.setSelectionRange(start,this.selected.end);this.onselect();}
      else if(this.moving&&this.selected){this.move(this.selectionStart);this.moving=false;}
      else {this.selected=undefined;this.onselect();}
    });
    element.addEventListener('dragstart',e=>{const item=(e.target as Element).closest<HTMLElement>('[data-inline]');if(!item)return;this.selected={start:this.offsetOf(item),end:this.offsetOf(item)+item.dataset.inline!.length};e.dataTransfer?.setData('application/x-pocket-inline',item.dataset.inline!);this.onselect();});
    element.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('application/x-pocket-inline'))e.preventDefault();});
    element.addEventListener('drop',e=>{if(!e.dataTransfer?.types.includes('application/x-pocket-inline'))return;e.preventDefault();const doc=document as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range|null};const r=doc.caretRangeFromPoint?.(e.clientX,e.clientY);if(r&&element.contains(r.startContainer)){const s=window.getSelection()!;s.removeAllRanges();s.addRange(r);this.move(this.selectionStart);}});
    element.addEventListener('paste',e=>{if(e.clipboardData?.files.length)return;e.preventDefault();this.setRangeText(e.clipboardData?.getData('text/plain')??'',this.selectionStart,this.selectionEnd);this.change();});
    element.addEventListener('beforeinput',e=>{const input=e as InputEvent;if(input.inputType==='insertParagraph'||input.inputType==='insertLineBreak'){e.preventDefault();this.setRangeText('\n',this.selectionStart,this.selectionEnd);this.change();}});
  }
  highlight(){this.element.querySelectorAll<HTMLElement>('[data-inline]').forEach(el=>el.classList.toggle('is-selected',!!this.selected&&this.offsetOf(el)===this.selected.start));}
  private offsetOf(node:Node){const range=document.createRange();range.selectNodeContents(this.element);range.setEndBefore(node);return this.read(range.cloneContents()).length;}
  private read(node:Node):string {
    if(node.nodeType===Node.TEXT_NODE)return node.textContent??'';
    if(node instanceof HTMLElement){if(node.dataset.sentinel)return '';if(node.dataset.inline)return node.dataset.inline;if(node.tagName==='BR')return '\n';}
    return Array.from(node.childNodes).map((child,i)=>((child instanceof HTMLElement&&['DIV','P'].includes(child.tagName)&&i>0)?'\n':'')+this.read(child)).join('');
  }
  get value(){return this.read(this.element);}
  set value(text:string){
    this.element.replaceChildren();let offset=0;
    for(const part of graphemes(text)){
      const image=this.image(part),emoji=/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(part);
      if(image||emoji){const span=document.createElement('span');span.className='inline-piece';span.contentEditable='false';span.draggable=true;span.tabIndex=0;span.onkeydown=e=>{if(!['Delete','Backspace','ArrowLeft','ArrowRight','Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();this.selected={start:this.offsetOf(span),end:this.offsetOf(span)+part.length};if(e.key==='Delete'||e.key==='Backspace')this.remove();else if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.step(e.key==='ArrowLeft'?-1:1);else this.onselect();};span.dataset.inline=part;span.dataset.offset=String(offset);span.setAttribute('role','button');span.setAttribute('aria-label',image?`行内贴纸：${image.name}`:`行内表情：${part}`);
        if(image){const img=document.createElement('img');img.src=image.url;img.alt=image.name;img.draggable=false;span.append(img);}else span.textContent=part;this.element.append(span);
      }else if(part==='\n')this.element.append(document.createElement('br'));else this.element.append(document.createTextNode(part));offset+=part.length;
    }
    // A final newline needs a sentinel BR to keep a caret on the empty line.
    const sentinel=document.createElement('br');sentinel.dataset.sentinel='true';sentinel.style.display=text.endsWith('\n')?'':'none';this.element.append(sentinel);
    this.remembered=[0,0];this.selected=undefined;this.moving=false;this.onselect();
  }
  private offsets(){const selection=window.getSelection();if(!selection?.rangeCount||!this.element.contains(selection.anchorNode))return this.remembered;const r=selection.getRangeAt(0),before=document.createRange();before.selectNodeContents(this.element);before.setEnd(r.startContainer,r.startOffset);const start=this.read(before.cloneContents());return [start.length,start.length+this.read(r.cloneContents()).length];}
  get selectionStart(){return this.offsets()[0];}get selectionEnd(){return this.offsets()[1];}
  setSelectionRange(start:number,end:number){
    const locate=(at:number):[Node,number]=>{let count=0;for(const node of this.element.childNodes){const length=this.read(node).length;if(at<=count+length){if(node.nodeType===Node.TEXT_NODE)return [node,Math.max(0,at-count)];return [this.element,Array.prototype.indexOf.call(this.element.childNodes,node)+(at>count?1:0)];}count+=length;}return [this.element,this.element.childNodes.length];};
    const a=locate(start),b=locate(end),r=document.createRange();r.setStart(...a);r.setEnd(...b);const s=window.getSelection()!;s.removeAllRanges();s.addRange(r);this.remembered=[start,end];
  }
  setRangeText(text:string,start:number,end:number,_mode='end'){const next=this.value.slice(0,start)+text+this.value.slice(end);if(next.length>this.maxLength)return;this.value=next;this.focus({preventScroll:true});this.setSelectionRange(start+text.length,start+text.length);}
  move(target:number){if(!this.selected)return;const result=moveInline(this.value,this.selected.start,this.selected.end,target);this.value=result.text;this.selected={start:result.start,end:result.end};this.setSelectionRange(result.start,result.end);this.change();this.onselect();}
  remove(){if(!this.selected)return;const {start,end}=this.selected;this.setRangeText('',start,end);this.change();this.onselect();}
  step(direction:number){if(!this.selected)return;const {start,end}=this.selected;const part=direction<0?graphemes(this.value.slice(0,start)).at(-1):graphemes(this.value.slice(end))[0];if(part)this.move(direction<0?start-part.length:end+part.length);}
  get style(){return this.element.style;}focus(options?:FocusOptions){this.element.focus(options);}setAttribute(key:string,value:string){this.element.setAttribute(key,value);}set placeholder(value:string){this.element.dataset.placeholder=value;}
}
