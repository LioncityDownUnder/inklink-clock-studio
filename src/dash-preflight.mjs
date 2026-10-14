/** Read-only NRF- transfer sequence audit. NEVER makes BLE calls. */
export function auditDashSequence(plan, {attMtu=null}={}) {
  if(!plan || !Array.isArray(plan.packets) || !plan.profile ||
     !(plan.refreshCommand instanceof Uint8Array)) throw new TypeError('Invalid offline image plan');
  const failures=[];
  const expectedBytes=plan.bwBytes+(plan.redBytes||0);
  if (!Number.isInteger(expectedBytes)||expectedBytes<=0) failures.push('Missing image length');
  let count=0,bytes=0,plane='bw',expectedOffset=0;
  const maxLength=attMtu===null?null:attMtu-3;
  if(attMtu!==null&&(!Number.isInteger(attMtu)||attMtu<23||attMtu>517)) throw new RangeError('Invalid assumed MTU');
  for(const packet of plan.packets){
    const kind=packet?.[1]===0xff?'bw':packet?.[1]===0x00?'red':null;
    if(!kind || ![3,4].includes(packet[0]) || packet.length<5 || packet.length>244) failures.push('Invalid packet header/size at '+count);
    if(kind!==plane){
      if(plane==='red'||kind!=='red'||expectedOffset!==plan.bwBytes) failures.push('Unexpected plane transition at '+count);
      plane=kind;expectedOffset=0;
    }
    const offset=(packet[2]<<8)|packet[3];
    if(offset!==expectedOffset)failures.push('Offset mismatch at packet '+count);
    expectedOffset+=Math.max(0,packet.length-4);
    bytes+=Math.max(0,packet.length-4);
    if(maxLength!==null&&packet.length>maxLength)failures.push('Packet exceeds assumed ATT value capacity at '+count);
    count++;
  }
  if(bytes!==expectedBytes)failures.push('Image byte count mismatch');
  if((plan.redBytes||0)>0 && plane!=='red')failures.push('Missing red plane');
  if(plan.refreshCommand.length!==1||plan.refreshCommand[0]!==plan.profile.refresh)
    failures.push('Unexpected final refresh command');
  return {
    passed:failures.length===0,
    failures,
    verifiedPacketCount:count,
    verifiedImageBytes:bytes,
    finalOperation:'EPD acknowledged write: '+Array.from(plan.refreshCommand,x=>x.toString(16).padStart(2,'0')).join('').toUpperCase(),
    sourceOrder:'BW chunks → red chunks (if supported) → 300ms wait → EPD refresh',
    safety:'OFFLINE AUDIT ONLY. No BLE write, browser MTU check, recovery or physical upload performed.'
  };
}
