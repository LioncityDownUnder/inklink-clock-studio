/**
 * Mock-only adapter for supervised transfer engine.
 * No navigator.bluetooth, characteristic or actual device references.
 */
import { transferDashImageSupervised } from './dash-supervised-transfer.mjs';

export async function runMockSupervisedTransfer({
  plan,audit,signal,onProgress=()=>{},
  delayMs=35,failAtPacket=null
}={}){
  if(!Number.isInteger(delayMs)||delayMs<0||delayMs>2000)
    throw new RangeError('Invalid simulated packet delay');
  if(failAtPacket!==null&&(!Number.isInteger(failAtPacket)||failAtPacket<1))
    throw new RangeError('Invalid failure packet number');
  let calls=0;
  const write=async packet=>{
    calls++;
    if(signal?.aborted) throw new Error('Mock aborted');
    if(failAtPacket!==null && calls===failAtPacket) throw new Error('SIMULATED packet failure at '+calls);
    if(delayMs) await new Promise(resolve=>setTimeout(resolve,delayMs));
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
