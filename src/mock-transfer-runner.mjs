/**
 * Mock-only adapter for supervised transfer engine.
 * No navigator.bluetooth, characteristic or actual device references.
 */
import { transferDashImageSupervised } from './dash-supervised-transfer.mjs';
import { createPendingWriteMonitor } from './pending-write-monitor.mjs';

export async function runMockSupervisedTransfer({
  plan,audit,signal,onProgress=()=>{},
  delayMs=35,failAtPacket=null,stallAtPacket=null,stallDurationMs=4500,onPendingStatus=()=>{}
}={}){
  if(!Number.isInteger(delayMs)||delayMs<0||delayMs>2000)
    throw new RangeError('Invalid simulated packet delay');
  if(failAtPacket!==null&&(!Number.isInteger(failAtPacket)||failAtPacket<1))
    throw new RangeError('Invalid failure packet number');
  if(stallAtPacket!==null&&(!Number.isInteger(stallAtPacket)||stallAtPacket<1))
    throw new RangeError('Invalid stalled packet number');
  if(!Number.isInteger(stallDurationMs)||stallDurationMs<1500||stallDurationMs>12000)
    throw new RangeError('Invalid mock stall duration');
  if(typeof onPendingStatus!=='function')throw new TypeError('Invalid pending status callback');
  const monitor=createPendingWriteMonitor({warnAfterMs:1000,onStatus:onPendingStatus});
  let calls=0;
  const write=async packet=>{
    calls++;
    if(signal?.aborted) throw new Error('Mock aborted');
    if(failAtPacket!==null && calls===failAtPacket) throw new Error('SIMULATED packet failure at '+calls);
    const duration=stallAtPacket===calls?stallDurationMs:delayMs;
    monitor.begin(calls);
    // Poll ONLY to surface warning; never resolve/reject the in-flight write.
    const watch=setInterval(()=>monitor.inspect(),150);
    try{
      if(duration)await new Promise(resolve=>setTimeout(resolve,duration));
      monitor.finish(true);
    }catch(error){
      monitor.finish(false);throw error;
    }finally{clearInterval(watch)}
    if(signal?.aborted) throw new Error('Mock aborted after pending write');
    if(!(packet instanceof Uint8Array)) throw new Error('Mock expects byte packets');
  };
  return transferDashImageSupervised({
    plan,audit,write,
    isConnected:()=>true,
    onProgress,signal,consent:true,
    gapMs:0,refreshDelayMs:300
  });
}
