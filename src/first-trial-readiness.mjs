/** Pure, read-only first-hardware-trial preparation. Never sends BLE writes. */
export function prepareFirstHardwareTrial({
  plan, audit, panelProfileConfirmed=false,
  acknowledgedWriteAvailable=false, browserWriteSizeVerified=false,
  recoveryVerified=false
}={}){
  const checks=[
    {name:'Packet sequence audit',passed:audit?.passed===true},
    {name:'Selected 400×300 panel profile independently confirmed',passed:panelProfileConfirmed===true},
    {name:'Chrome acknowledged EPD write interface',passed:acknowledgedWriteAvailable===true},
    {name:'Chrome 244-byte write acceptance',passed:browserWriteSizeVerified===true},
    {name:'Interrupted-image recovery procedure validated',passed:recoveryVerified===true}
  ];
  const packets=Number.isInteger(plan?.packetCount)?plan.packetCount:0;
  const bytes=Number.isInteger(plan?.transmissionBytes)?plan.transmissionBytes:0;
  if(packets<1||bytes<1)checks.push({name:'Transfer plan generated',passed:false});
  return Object.freeze({
    checks:checks.map(x=>Object.freeze(x)),
    hardwareReady:checks.every(x=>x.passed),
    proposedPackets:packets,
    proposedBytes:bytes,
    physicalUploadEnabled:false,
    approvedToSendNow:false,
    statement:'Risk acceptance authorizes preparation only. A new explicit confirmation at the device is required for any later image transmission.'
  });
}
