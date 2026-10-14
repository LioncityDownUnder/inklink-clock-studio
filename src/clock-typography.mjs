/** Offline-only clock layout helpers; no BLE, no device operation. */
export function wrapFooterText(text, maxChars=26, maxLines=3) {
  if (!Number.isInteger(maxChars)||maxChars<8||!Number.isInteger(maxLines)||maxLines<1)
    throw new RangeError('Invalid footer bounds');
  const words=String(text||'').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const lines=[];
  let current='';
  for(const word of words){
    if(current && (current.length+1+word.length)>maxChars){
      lines.push(current);current='';
    }
    if(word.length>maxChars){
      if(current){lines.push(current);current='';}
      for(let i=0;i<word.length;i+=maxChars)lines.push(word.slice(i,i+maxChars));
    }else current=current?current+' '+word:word;
  }
  if(current)lines.push(current);
  if(lines.length<=maxLines)return lines;
  // Never silently drop words: caller should use fitted single-line fallback.
  return [String(text||'').trim().toUpperCase()];
}
export function getClockLayout(width,height,highContrast=false) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
    throw new RangeError('Invalid canvas');
  const portrait=width<height;
  if(!highContrast)return Object.freeze({portrait,footerSize:height*.033,footerY:height*(portrait?.84:.91),footerMaxLines:1,footerInk:'#3D4650'});
  return Object.freeze({
    portrait,
    footerSize:Math.max(13,Math.round(height*(portrait?.045:.05))),
    footerY:height*(portrait?.81:.86),
    footerMaxLines:portrait?2:2,
    footerInk:'#000000'
  });
}
