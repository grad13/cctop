#!/usr/bin/env node

/**
 * Test Japanese display
 */

const stringWidth = require('string-width');

console.log('Testing Japanese display with string-width:');
console.log('');

const testStrings = [
  'index.ts',
  'API設計書.md',
  'テストファイル.spec.js',
  'ドキュメント.md',
  '新機能実装.tsx',
  'user_管理画面.tsx'
];

console.log('File Name                            Width');
console.log('------------------------------------  -----');

testStrings.forEach(str => {
  const width = stringWidth(str);
  const padded = str + ' '.repeat(Math.max(0, 35 - width));
  console.log(`${padded}  ${width}`);
});

console.log('');
console.log('Column alignment test:');
console.log('');
console.log('Timestamp            Elapsed  File Name                          Event    Lines  Blocks Directory');
console.log('-------------------  -------  ---------------------------------  -------  -----  ------ ---------');

const events = [
  { time: '2025-07-04 10:15:30', elapsed: '00:15', file: 'index.ts', event: 'modify', lines: '125', blocks: '8', dir: 'src/' },
  { time: '2025-07-04 10:15:25', elapsed: '00:20', file: 'API設計書.md', event: 'create', lines: '450', blocks: '28', dir: 'docs/' },
  { time: '2025-07-04 10:15:20', elapsed: '00:25', file: 'テストファイル.spec.js', event: 'modify', lines: '89', blocks: '6', dir: 'test/' }
];

events.forEach(e => {
  const fileWidth = stringWidth(e.file);
  const filePadded = e.file + ' '.repeat(Math.max(0, 35 - fileWidth));
  console.log(`${e.time}  ${e.elapsed}  ${filePadded}  ${e.event.padEnd(7)}  ${e.lines.padStart(5)}  ${e.blocks.padStart(6)} ${e.dir}`);
});