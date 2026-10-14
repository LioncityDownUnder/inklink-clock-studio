/** User-triggered GATT inspection: no write, no notify, no command probes. */
export const TELEMETRY_SERVICES=Object.freeze([
  Object.freeze({uuid:'0000180f-0000-1000-8000-00805f9b34fb',name:'Battery Service'}),
  Object.freeze({uuid:'0000181a-0000-1000-8000-00805f9b34fb',name:'Environmental Sensing'}),
  Object.freeze({uuid:'00001809-0000-1000-8000-00805f9b34fb',name:'Health Thermometer'})
]);
export const BATTERY_LEVEL_UUID='00002a19-0000-1000-8000-00805f9b34fb';
export const TEMPERATURE_UUID='00002a6e-0000-1000-8000-00805f9b34fb';
const props=['read','write','writeWithoutResponse','notify','indicate','broadcast'];
export function describeGattCharacteristic(ch) {
  return Object.freeze({
    uuid:String(ch.uuid||'unknown').toLowerCase(),
    properties:props.filter(p=>Boolean(ch.properties?.[p]))
  });
}
export function decodeStandardTelemetry(uuid,view) {
  if(!(view instanceof DataView))throw new TypeError('Expected BLE DataView');
  const id=String(uuid).toLowerCase();
  if(id===BATTERY_LEVEL_UUID){
    if(view.byteLength!==1)throw new Error('Battery Level must be one byte');
    const value=view.getUint8(0);
    if(value>100)throw new RangeError('Battery level outside 0–100%');
    return Object.freeze({name:'Standard Battery Level',value,unit:'%',note:'Standard GATT percentage, not the 3.9V shown on the clock'});
  }
  if(id===TEMPERATURE_UUID){
    if(view.byteLength!==2)throw new Error('Temperature must be signed 16-bit');
    const value=view.getInt16(0,true)/100;
    return Object.freeze({name:'Standard Temperature',value,unit:'°C',note:'Sensor source and calibration are unverified'});
  }
  throw new Error('Unsupported characteristic: no speculative decoding');
}
export async function inspectGattReadOnly({server,isConnected=()=>true,onEvent=()=>{}}={}) {
  if(!server?.connected||!isConnected())throw new Error('Connect to the clock first');
  const report=[];
  const permitted=await server.getPrimaryServices();
  for(const service of permitted) {
    if(!isConnected())throw new Error('Connection lost during read-only GATT inspection');
    const entry={service:String(service.uuid).toLowerCase(),characteristics:[],measurements:[],errors:[]};
    report.push(entry);
    let chars;
    try{chars=await service.getCharacteristics()}
    catch(err){entry.errors.push('Cannot list characteristics: '+String(err.message||err));continue}
    for(const ch of chars){
      const meta=describeGattCharacteristic(ch);
      entry.characteristics.push(meta);
      // Only parse registered, standard characteristics under their registered services.
      const recognized=(entry.service===TELEMETRY_SERVICES[0].uuid&&meta.uuid===BATTERY_LEVEL_UUID)||
        (entry.service===TELEMETRY_SERVICES[1].uuid&&meta.uuid===TEMPERATURE_UUID);
      if(!recognized||!ch.properties?.read)continue;
      if(!isConnected())throw new Error('Connection lost before standard characteristic read');
      try {
        const value=await ch.readValue();
        const parsed=decodeStandardTelemetry(meta.uuid,value);
        entry.measurements.push(parsed);
        onEvent(parsed);
      } catch(err){entry.errors.push('Standard read '+meta.uuid+': '+String(err.message||err))}
    }
  }
  return report;
}
