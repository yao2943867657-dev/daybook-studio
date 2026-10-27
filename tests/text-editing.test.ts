import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, type TextLine } from '../src/model';
import { bodyPageRange, replaceBodyRange } from '../src/text-editing';

const pagesFor = (body: string) => paginate(body, 5, 2, text => Array.from(text).length);

test('页内编辑范围按顺序区分重复正文，原文拼接不丢空格和段落', () => {
  const body = '  今天去公园。今天去公园。  \n\n    今天去公园。今天去公园。\n\n最后一段。  ';
  const pages = pagesFor(body), ranges = pages.map((_, i) => bodyPageRange(body, pages, i));
  assert.ok(ranges.length > 2);
  assert.equal(ranges[0].start, 0);
  assert.equal(ranges.at(-1)!.end, body.length);
  assert.equal(ranges.map(range => range.text).join(''), body);
  for (let i = 1; i < ranges.length; i++) assert.equal(ranges[i].start, ranges[i - 1].end);
});

test('长文逐页替换只改变选中范围，后页与段落保持完整', () => {
  const body = '同一句话。'.repeat(30) + '\n\n结尾不能丢。';
  const pages = pagesFor(body), range = bodyPageRange(body, pages, 4);
  const edited = replaceBodyRange(body, range.start, range.end, '这是修改后的这一页。\n');
  assert.equal(edited, body.slice(0, range.start) + '这是修改后的这一页。\n' + body.slice(range.end));
  assert.ok(edited.endsWith('\n\n结尾不能丢。'));
});

test('emoji 的源范围按完整字符定位，最后一页包含尾部空白', () => {
  const body = '  🌷今天😊很好🌷🌷\n\n明天也开心😊  \n';
  const pages = pagesFor(body), ranges = pages.map((_, i) => bodyPageRange(body, pages, i));
  assert.equal(ranges.map(range => range.text).join(''), body);
  for (const range of ranges) {
    assert.ok(!/^[\uDC00-\uDFFF]/.test(range.text));
    assert.ok(!/[\uD800-\uDBFF]$/.test(range.text));
  }
  const range = ranges.at(-1)!;
  assert.ok(range.text.endsWith('  \n'));
  assert.equal(replaceBodyRange(body, range.start, range.end, '晚安🌙'), body.slice(0, range.start) + '晚安🌙');
});

test('空日记保留第一页面空白，媒体续页只在文末追加', () => {
  const blank = ' \n\n  ', blankPages = pagesFor(blank);
  assert.deepEqual(bodyPageRange(blank, blankPages, 0), { start: 0, end: blank.length, text: blank });
  assert.deepEqual(bodyPageRange(blank, [...blankPages, []], 1), { start: blank.length, end: blank.length, text: '' });
  const body = '只有一行', pages: TextLine[][] = [...pagesFor(body), [], []];
  const range = bodyPageRange(body, pages, 2);
  assert.deepEqual(range, { start: body.length, end: body.length, text: '' });
  assert.equal(replaceBodyRange(body, range.start, range.end, '\n新的一页'), '只有一行\n新的一页');
});

test('超长替换被拒绝，不能静默截掉后续页面', () => {
  const body = '前页正文后页正文';
  assert.throws(() => replaceBodyRange(body, 2, 4, '新增内容'.repeat(4), 12), /最多支持/);
  assert.equal(body, '前页正文后页正文');
  assert.equal(replaceBodyRange(body, 2, 4, '改', 12), '前页改后页正文');
});

test('异常范围、旧分页及拆开 emoji 的边界均拒绝', () => {
  assert.throws(() => bodyPageRange('新正文', [[{ text: '旧正文', paragraph: 0, first: true }]], 0), /书页已变化/);
  assert.throws(() => bodyPageRange('正文', [], -1), /页码/);
  assert.throws(() => replaceBodyRange('正文', -1, 1, 'x'), /范围/);
  assert.throws(() => replaceBodyRange('正文', 0, 4, 'x'), /范围/);
  assert.throws(() => replaceBodyRange('🌷花', 1, 2, 'x'), /表情字符/);
});
