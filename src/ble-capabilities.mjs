/** Read-only Web Bluetooth capability report. Does not read values or write to the peripheral. */
export function describeEpdWriteCapabilities(characteristic, connected) {
  if (!connected || !characteristic) return {
    status:'not-connected', writable:false, supported:false,
    message:'Connect to the NRF- clock first. No probe packets will be sent.'
  };
  const p=characteristic.properties || {};
  const acknowledged=Boolean(p.write);
  const api=typeof characteristic.writeValueWithResponse==='function';
  const legacy=typeof characteristic.writeValue==='function';
  return {
    status:'inspected',
    writable:acknowledged,
    supported:acknowledged && (api || legacy),
    acknowledgedProperty:acknowledged,
    withResponseMethod:api,
    legacyMethod:legacy,
    withoutResponseProperty:Boolean(p.writeWithoutResponse),
    message: acknowledged && (api||legacy)
      ? 'Acknowledged EPD writes are exposed. Chrome Web Bluetooth does not provide a negotiated ATT MTU or a non-writing way to prove a 244-byte write will succeed.'
      : 'Acknowledged EPD image-write capability is not available. Do not attempt an image upload.'
  };
}
