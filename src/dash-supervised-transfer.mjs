/** NRF- supervised transfer engine. All Bluetooth access injected; unused by live UI. */
export class ImageTransferAbortedError extends Error {
  constructor(message='Transfer aborted before completing the image') {
    super(message); this.name='ImageTransferAbortedError';
  }
}
function ensureActive(signal, connected) {
  if(signal?.aborted) throw new ImageTransferAbortedError();
  if(!connected()) throw new ImageTransferAbortedError('Bluetooth disconnected; image is incomplete');
}
async function waitWithAbort(ms, signal, connected) {
  for(let elapsed=0;elapsed<ms;elapsed+=25){
    ensureActive(signal,connected);
    await new Promise(resolve=>setTimeout(resolve,Math.min(25,ms-elapsed)));
  }
  ensureActive(signal,connected);
}
/**
 * Requires acknowledged write callback, consent, and offline packet audit.
 * No automatic resume, retry, reconnect, rollback or EPD refresh on incomplete image.
 * A write promise must resolve only once writeValueWithResponse resolves.
 */
export async function transferDashImageSupervised({
  plan, audit, write, isConnected, onProgress=()=>{},
  signal, consent=false, gapMs=0, refreshDelayMs=300
}={}){
  if(consent!==true) throw new Error('Explicit supervised transfer consent required');
  if(!audit?.passed) throw new Error('Offline image audit must pass');
  if(!Array.isArray(plan?.packets)||!plan.packets.length||
     !(plan.refreshCommand instanceof Uint8Array)||plan.refreshCommand.length!==1)
    throw new TypeError('Invalid image transfer plan');
  if(typeof write!=='function'||typeof isConnected!=='function'||typeof onProgress!=='function')
    throw new TypeError('Required callbacks missing');
  if(!Number.isInteger(gapMs)||gapMs<0||gapMs>5000||
     !Number.isInteger(refreshDelayMs)||refreshDelayMs<0||refreshDelayMs>10000)
    throw new RangeError('Invalid transfer delay');
  let sent=0;
  const total=plan.packets.length;
  const notify=stage=>onProgress(Object.freeze({
    stage,completed:sent,total,percent:Math.floor(100*sent/total)
  }));
  try{
    ensureActive(signal,isConnected);
    notify('starting');
    for(let i=0;i<total;i++){
      ensureActive(signal,isConnected);
      const packet=plan.packets[i];
      if(!(packet instanceof Uint8Array)||packet.length<5||packet.length>244)
        throw new Error('Image packet invalid at '+i);
      await write(packet.slice());
      sent++;
      notify('image');
      if(gapMs>0 && i<total-1)await waitWithAbort(gapMs,signal,isConnected);
    }
    ensureActive(signal,isConnected);
    notify('waiting-to-refresh');
    await waitWithAbort(refreshDelayMs,signal,isConnected);
    ensureActive(signal,isConnected);
    notify('refreshing');
    await write(plan.refreshCommand.slice());
    notify('refresh-write-acknowledged');
    return Object.freeze({
      completed:sent,total,refreshWriteAcknowledged:true,
      physicalDisplayVerified:false
    });
  }catch(error){
    try{notify('stopped-incomplete-or-unknown');}catch{}
    throw error;
  }
}
