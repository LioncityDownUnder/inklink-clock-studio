/** Explicit, bounded, SINGLE read of an uncharacterized 221F/331F GATT value.
 * This is NOT a telemetry decoder. No writes, subscriptions, commands, or retries.
 */
export const RAW_221F_SERVICE='0000221f-0000-1000-8000-00805f9b34fb';
export const RAW_331F_CHARACTERISTIC='0000331f-0000-1000-8000-00805f9b34fb';
export async function readRaw331fOnce({server,consent=false,isConnected=()=>true,maxDisplayBytes=64}={}){
  if(consent!==true)throw new Error('Explicit single-read consent required');
  if(!server?.connected||!isConnected())throw new Error('Connect to the clock first');
  if(!Number.isInteger(maxDisplayBytes)||maxDisplayBytes<1||maxDisplayBytes>64)
    throw new RangeError('Unsafe raw diagnostic length');
  const service=await server.getPrimaryService(RAW_221F_SERVICE);
  if(!isConnected())throw new Error('Clock disconnected before characteristic lookup');
  const ch=await service.getCharacteristic(RAW_331F_CHARACTERISTIC);
  if(!ch.properties?.read||typeof ch.readValue!=='function')
    throw new Error('331F cannot be read using standard GATT readValue');
  if(!isConnected())throw new Error('Clock disconnected before raw read');
  const value=await ch.readValue(); // exactly ONE device read; no retries
  if(!(value instanceof DataView))throw new TypeError('Raw BLE read did not return DataView');
  const displayed=Math.min(value.byteLength,maxDisplayBytes);
  const bytes=new Uint8Array(value.buffer,value.byteOffset,displayed);
  const hex=Array.from(bytes,n=>n.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  return Object.freeze({
    service:RAW_221F_SERVICE,characteristic:RAW_331F_CHARACTERISTIC,
    returnedLength:value.byteLength,displayedLength:displayed,truncated:value.byteLength>displayed,
    hex:hex||'(empty)',interpretation:'Unknown proprietary bytes; not decoded as voltage, battery or temperature'
  });
}
