/** Supervised upload DRY RUN. Never uses Web Bluetooth or transmits packets. */
export function createUploadRehearsal(plan, audit, {assumedMtu=247}={}) {
  if (!plan?.packets?.length || !audit?.passed) {
    return {ready:false,reasons:['Offline image sequence audit has not passed.'],steps:[]};
  }
  if (!Number.isInteger(assumedMtu)||assumedMtu<23) throw new RangeError('Invalid hypothetical MTU');
  const reasons=[];
  if (plan.maxPacketBytes>assumedMtu-3) reasons.push('Packet exceeds the assumed MTU - 3 value capacity.');
  const steps=[
    'Confirm device is the intended NRF- clock and physical panel profile.',
    'Connect in Safe mode; close competing BLE apps.',
    'Require explicit informed approval before any real write.',
    'Transmit BW then red image packets with acknowledged EPD writes; stop at first error.',
    'Never send final refresh when any image packet is missing.',
    'After successful data writes, wait 300ms and request EPD refresh.',
    'Verify physical display; only then consider manually restoring Clock mode.',
    'If disconnected, never automatically resume; inspect actual clock condition first.'
  ];
  return {
    ready:reasons.length===0,
    reasons,
    steps,
    packets:plan.packetCount,
    bytes:plan.transmissionBytes,
    hypotheticalMtu:assumedMtu,
    hardwareWriteCapacityVerified:false,
    dryRunOnly:true,
    rollbackVerified:false,
    uploadAuthorized:false
  };
}
