const stringWidth = require('string-width');

function padEndWithWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  const padding = targetWidth - currentWidth;
  
  if (padding <= 0) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return str + ' '.repeat(padding);
}

function padStartWithWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  const padding = targetWidth - currentWidth;
  
  if (padding <= 0) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return ' '.repeat(padding) + str;
}

function truncateWithEllipsis(str: string, maxWidth: number): string {
  if (stringWidth(str) <= maxWidth) return str;
  
  const ellipsis = '...';
  const ellipsisWidth = stringWidth(ellipsis);
  let truncated = '';
  let width = 0;
  
  for (const char of str) {
    const charWidth = stringWidth(char);
    if (width + charWidth + ellipsisWidth > maxWidth) {
      return truncated + ellipsis;
    }
    truncated += char;
    width += charWidth;
  }
  
  return truncated;
}

module.exports = {
  padEndWithWidth,
  padStartWithWidth,
  truncateWithEllipsis
};