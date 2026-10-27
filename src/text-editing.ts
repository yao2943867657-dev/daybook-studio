import type { TextLine } from './model';

export interface BodyPageRange { start: number; end: number; text: string }

/** Map rendered lines back to the untrimmed source, keeping all whitespace intact. */
export function bodyPageRange(body: string, pages: TextLine[][], page: number): BodyPageRange {
  if (!Number.isInteger(page) || page < 0) throw new Error('日记页码无效');
  const starts: (number | undefined)[] = [];
  let cursor = 0;
  for (const lines of pages) {
    let start: number | undefined;
    for (const line of lines) {
      if (!line.text) continue;
      const index = body.indexOf(line.text, cursor);
      if (index < 0) throw new Error('书页已变化，请完成编辑后重新打开这一页');
      if (start === undefined) start = index;
      cursor = index + line.text.length;
    }
    starts.push(start);
  }
  // A blank diary's first page owns its whitespace; extra media pages own no text.
  if (starts.every(start => start === undefined)) {
    return page === 0 ? { start: 0, end: body.length, text: body } : { start: body.length, end: body.length, text: '' };
  }
  if (starts[page] === undefined) return { start: body.length, end: body.length, text: '' };
  const start = page === 0 ? 0 : starts[page]!;
  const next = starts.slice(page + 1).find(value => value !== undefined);
  const end = next ?? body.length;
  return { start, end, text: body.slice(start, end) };
}

/** Replace only the captured source range; reject overflow rather than truncating later pages. */
export function replaceBodyRange(body: string, start: number, end: number, replacement: string, maxLength = 10000): string {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > body.length) throw new Error('日记编辑范围无效');
  const splitsSurrogate = (offset: number) => offset > 0 && offset < body.length && /[\uD800-\uDBFF]/.test(body[offset - 1]) && /[\uDC00-\uDFFF]/.test(body[offset]);
  if (splitsSurrogate(start) || splitsSurrogate(end)) throw new Error('日记编辑范围不能拆开表情字符');
  if (!Number.isInteger(maxLength) || maxLength < 0 || body.length - (end - start) + replacement.length > maxLength) throw new Error(`日记最多支持 ${maxLength} 字，请减少本页内容`);
  return body.slice(0, start) + replacement + body.slice(end);
}
