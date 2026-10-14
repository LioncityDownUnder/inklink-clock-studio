/**
 * Pure observer for a pending acknowledged BLE write.
 * WARNING is not a timeout, failure, cancellation or proof of lost packets.
 * No browser APIs, BLE calls, timers or writes in this module.
 */
export function createPendingWriteMonitor({
  warnAfterMs=1500, now=()=>Date.now(), onStatus=()=>{}
}={}){
  if(!Number.isFinite(warnAfterMs)||warnAfterMs<=0 ||
     typeof now!=='function'||typeof onStatus!=='function')
    throw new TypeError('Invalid pending-write monitor settings');
  let current=null;
  let warned=false;
  const report=(status,elapsedMs)=>onStatus(Object.freeze({
    status,elapsedMs,sequence:current?.sequence??null
  }));
  return Object.freeze({
    begin(sequence){
      if(current!==null) throw new Error('Previous write is still pending');
      if(!Number.isInteger(sequence)||sequence<1)throw new RangeError('Invalid packet number');
      current={sequence,start:now()};warned=false;report('pending',0);
    },
    inspect(){
      if(current===null)return Object.freeze({status:'idle',elapsedMs:0});
      const elapsedMs=Math.max(0,now()-current.start);
      if(!warned&&elapsedMs>=warnAfterMs){
        warned=true;report('stalled-warning',elapsedMs);
      }
      return Object.freeze({status:warned?'still-pending-after-warning':'pending',elapsedMs,sequence:current.sequence});
    },
    finish(success){
      if(current===null)throw new Error('No write pending');
      const elapsedMs=Math.max(0,now()-current.start);
      report(success?'resolved':'rejected',elapsedMs);
      current=null;warned=false;
    },
    get pending(){return current!==null;}
  });
}
