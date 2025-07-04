#!/usr/bin/env node

/**
 * Test FUNC-204 Directory Path Truncation
 */

const stringWidth = require('string-width').default;

// FUNC-204 implementation
function truncateDirectoryPath(path, maxWidth) {
  const width = stringWidth(path);
  
  if (width <= maxWidth) {
    return path;
  }
  
  const ellipsis = '...';
  const ellipsisWidth = 3;
  const targetWidth = maxWidth - ellipsisWidth;
  
  // Take characters from the end
  let result = '';
  let currentWidth = 0;
  
  // Iterate from the end of the string
  for (let i = path.length - 1; i >= 0 && currentWidth < targetWidth; i--) {
    const char = path[i];
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth <= targetWidth) {
      result = char + result;
      currentWidth += charWidth;
    } else {
      break;
    }
  }
  
  return ellipsis + result;
}

console.log('FUNC-204 Directory Truncation Test');
console.log('===================================');
console.log('');

const testPaths = [
  '/Users/takuo-h/Workspace/Code/06-cctop/src/database/',
  '/very/long/path/to/deeply/nested/project/files/src/components/',
  '/短い/パス/',
  '/これは/とても/長い/日本語の/ディレクトリ/パス/です/src/components/',
  'src/',
  'documents/'
];

const widths = [50, 30, 20, 10];

widths.forEach(width => {
  console.log(`Width: ${width} characters`);
  console.log('-'.repeat(width));
  
  testPaths.forEach(path => {
    const truncated = truncateDirectoryPath(path, width);
    const actualWidth = stringWidth(truncated);
    console.log(`${truncated}${' '.repeat(Math.max(0, width - actualWidth))} | Original: ${path}`);
  });
  
  console.log('');
});