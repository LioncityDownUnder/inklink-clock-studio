import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGattReadOnly,decodeStandardTelemetry,BATTERY_LEVEL_UUID,TEMPERATURE_UUID,TELEMETRY_SERVICES} from '../src/gatt-diagnostics.mjs';
test('decode standard battery percent, not clock displayed voltage',()=>{
 const data=new DataView(Uint8Array.of(83).buffer);
 assert.deepEqual([decodeStandardTelemetry(BATTERY_LEVEL_UUID,data).value,decodeStandardTelemetry(BATTERY_LEVEL_UUID,data).unit],[83,'%']);
 assert.throws(()=>decodeStandardTelemetry(BATTERY_LEVEL_UUID,new DataView(Uint8Array.of(255).buffer)),RangeError);
});
test('decode GATT standard temperature signed hundredths celsius',()=>{
 const b=new Uint8Array(2);new DataView(b.buffer).setInt16(0,2150,true);
 assert.equal(decodeStandardTelemetry(TEMPERATURE_UUID,new DataView(b.buffer)).value,21.5);
});
test('reject proprietary or unknown characteristic values',()=>{
 assert.throws(()=>decodeStandardTelemetry('custom',new DataView(Uint8Array.of(57).buffer)),/Unsupported/);
});
test('read-only inspection reads only recognized standard characteristic, never calls writes',async()=>{
 let reads=0,writes=0;
 const write=()=>{writes++;throw new Error('No writing allowed')};
 const valid={uuid:BATTERY_LEVEL_UUID,properties:{read:true,write:true},readValue:async()=>{reads++;return new DataView(Uint8Array.of(77).buffer)},writeValueWithResponse:write};
 const custom={uuid:'custom',properties:{read:true},readValue:async()=>{throw new Error('Never read custom')}};
 const server={connected:true,getPrimaryServices:async()=>[
 {uuid:TELEMETRY_SERVICES[0].uuid,getCharacteristics:async()=>[valid,custom]},
 {uuid:TELEMETRY_SERVICES[1].uuid,getCharacteristics:async()=>[]}
 ]};
 const result=await inspectGattReadOnly({server});
 assert.equal(result.length,2);assert.equal(result[0].measurements[0].value,77);
 assert.equal(reads,1);assert.equal(writes,0);
});
test('metadata enumeration on unknown characteristics issues no value reads',async()=>{
 let calls=0;
 const server={connected:true,getPrimaryServices:async()=>[{uuid:'other',getCharacteristics:async()=>[{uuid:'custom',properties:{read:true},readValue:async()=>{calls++}}]}]};
 const result=await inspectGattReadOnly({server});
 assert.equal(result[0].characteristics.length,1);assert.equal(calls,0);
});
test('disconnected GATT refuses scan without Bluetooth activity',async()=>{
 await assert.rejects(inspectGattReadOnly({server:{connected:false}}),/Connect/);
});
