/**
 * REVIEW-ONLY NRF- BLE adapter construction.
 * NOT imported by the live app; never calls the clock by itself.
 * A pending Web Bluetooth write cannot be cancelled mid-operation.
 */
export class TransferGuardError extends Error {
  constructor(message){super(message);this.name='TransferGuardError';}
}
export function makeGuardedEpdWriter({
  characteristic, isConnected, isVisible, signal,
  now=()=>Date.now(), deadlineMs=60000,
  writeStartTime=now(), onEvent=()=>{}
}={}){
  if(!characteristic?.properties?.write ||
     typeof characteristic.writeValueWithResponse!=='function')
    throw new TransferGuardError('Acknowledged EPD write capability required');
  if(typeof isConnected!=='function'||typeof isVisible!=='function'||
     typeof now!=='function'||typeof onEvent!=='function')
    throw new TypeError('Missing guard callback');
  if(!Number.isFinite(deadlineMs)||deadlineMs<=0)
    throw new RangeError('Invalid deadline');
  let blocked=false;
  let pending=false;
  let writeCount=0;
  const guard=()=>{
    if(blocked)throw new TransferGuardError('Transfer writer blocked after previous failure');
    if(signal?.aborted)throw new TransferGuardError('Transfer cancelled');
    if(!isVisible())throw new TransferGuardError('Page not visible: stop further writes');
    if(!isConnected())throw new TransferGuardError('Bluetooth disconnected');
    if(now()-writeStartTime>=deadlineMs)throw new TransferGuardError('Supervised time budget exhausted');
  };
  return Object.freeze({
    async write(packet){
      if(pending)throw new TransferGuardError('Concurrent EPD writes are forbidden');
      guard();
      if(!(packet instanceof Uint8Array)||packet.length<1||packet.length>244)
        throw new TransferGuardError('Invalid characteristic packet');
      pending=true;
      try{
        // Completion here means GATT write promise resolved, NOT screen refreshed.
        await characteristic.writeValueWithResponse(packet.slice());
        writeCount++;
        onEvent(Object.freeze({kind:'write-acknowledged',writeCount,bytes:packet.length}));
        // Post-write guard stops refresh or subsequent packets if cancelled,
        // hidden, disconnected or beyond deadline during an in-flight write.
        guard();
      }catch(err){
        blocked=true;
        onEvent(Object.freeze({kind:'stop',writeCount,reason:String(err?.message||err)}));
        throw err;
      }finally{pending=false;}
    },
    canProceed:()=>{guard();return true;},
    stop:()=>{blocked=true;},
    getState:()=>Object.freeze({blocked,pending,writeCount})
  });
}
