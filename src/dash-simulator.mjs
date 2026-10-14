/**
 * Simulation-only NRF- image transfer diagnostics.
 * No BLE, timers, characteristic writes, filesystem or firmware commands.
 */
export function simulateDashTransfer(plan, {
  mtu=247,
  millisecondsPerPacket=200,
  disconnectAfterSeconds=60,
  refreshMilliseconds=4000,
  startDelayMilliseconds=0
}={}) {
  const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  if (!plan || !Array.isArray(plan.packets) || plan.packets.length===0 ||
      !plan.packets.every(p=>p instanceof Uint8Array && p.length>=5 && p.length<=244) ||
      !(plan.refreshCommand instanceof Uint8Array)) throw new TypeError('Invalid offline transfer plan');
  if (!valid(mtu,23,517) || !Number.isInteger(mtu)) throw new RangeError('MTU must be 23 to 517');
  if (!valid(millisecondsPerPacket,1,60000) || !valid(disconnectAfterSeconds,1,3600) ||
      !valid(refreshMilliseconds,0,120000) || !valid(startDelayMilliseconds,0,120000))
    throw new RangeError('Simulation timing outside allowed ranges');
  const characteristicLimit=mtu-3;
  const oversize=plan.packets.findIndex(p=>p.length>characteristicLimit);
  const packets=plan.packets.length;
  const deadline=disconnectAfterSeconds*1000;
  const completionMs=startDelayMilliseconds+packets*millisecondsPerPacket+refreshMilliseconds;
  const completePackets=Math.max(0,Math.min(packets,Math.floor((deadline-startDelayMilliseconds)/millisecondsPerPacket)));
  const interrupted=completionMs>deadline;
  const packetsBeforeDisconnect=interrupted?completePackets:packets;
  const transmittedBytes=plan.packets.slice(0,packetsBeforeDisconnect).reduce((n,p)=>n+p.length,0);
  let stoppedAt='complete';
  if (oversize!==-1) stoppedAt='mtu';
  else if (interrupted) stoppedAt=completePackets<packets?'image':'refresh';
  const result={
    mode:'SIMULATION ONLY — zero Bluetooth writes',
    packets, characteristicLimit, oversizePacketIndex:oversize,
    estimatedImageSeconds:(startDelayMilliseconds+packets*millisecondsPerPacket)/1000,
    estimatedTotalSeconds:completionMs/1000,
    estimatedDisconnectSeconds:disconnectAfterSeconds,
    estimatedCompletePackets:oversize===-1?packetsBeforeDisconnect:0,
    estimatedBytesBeforeDisconnect:oversize===-1?transmittedBytes:0,
    stopsAt:stoppedAt,
    feasibleWithinScenario:stoppedAt==='complete',
    restartRecommendation: stoppedAt==='complete'
      ? 'Simulation fits assumptions; hardware success is not established.'
      : stoppedAt==='mtu'
        ? 'Packet exceeds simulated ATT capacity. Do not attempt transfer.'
        : 'Assume partial frame is unsafe. Reconnect and restart full transfer only after a validated recovery protocol; do not resume blindly.'
  };
  return result;
}
