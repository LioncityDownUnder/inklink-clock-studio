import test from 'node:test';
import assert from 'node:assert/strict';
import {readRaw331fOnce,RAW_221F_SERVICE,RAW_331F_CHARACTERISTIC} from '../src/raw-331f-read.mjs';
const setup=(bytes=[0,15,16,255])=>{
 const stats={services:0,characteristics:0,reads:0,writes:0,notifies:0};
 const characteristic={properties:{read:true,write:true,notify:true},
   async readValue(){stats.reads++;return new DataView(Uint8Array.from(bytes).buffer)},
   async writeValueWithResponse(){stats.writes++},async startNotifications(){stats.notifies++}};
 const service={async getCharacteristic(uuid){stats.characteristics++;assert.equal(uuid,RAW_331F_CHARACTERISTIC);return characteristic}};
 const server={connected:true,async getPrimaryService(uuid){stats.services++;assert.equal(uuid,RAW_221F_SERVICE);return service}};
 return {server,stats,characteristic};
};
test('explicit consent required, no service call if absent',async()=>{
 const {server,stats}=setup();
 await assert.rejects(readRaw331fOnce({server}),/consent/);
 assert.equal(stats.services,0);
});
test('exactly one raw read produces uninterpreted uppercase hex; no writes or notifications',async()=>{
 const {server,stats}=setup();
 const r=await readRaw331fOnce({server,consent:true});
 assert.equal(r.hex,'00 0F 10 FF');
 assert.equal(r.returnedLength,4);assert.equal(r.truncated,false);
 assert.equal(stats.reads,1);assert.equal(stats.writes,0);assert.equal(stats.notifies,0);
});
test('cap displayed data at 64 bytes, preserve total length',async()=>{
 const {server}=setup(Array.from({length:101},(_,i)=>i));
 const r=await readRaw331fOnce({server,consent:true});
 assert.equal(r.returnedLength,101);assert.equal(r.displayedLength,64);assert.equal(r.truncated,true);
 assert.equal(r.hex.split(' ').length,64);
});
test('refuse read if property missing',async()=>{
 const {server,characteristic,stats}=setup();
 characteristic.properties.read=false;
 await assert.rejects(readRaw331fOnce({server,consent:true}),/cannot be read/);
 assert.equal(stats.reads,0);
});
test('connected check blocks before GATT discovery',async()=>{
 const {server,stats}=setup();
 await assert.rejects(readRaw331fOnce({server,consent:true,isConnected:()=>false}),/Connect/);
 assert.equal(stats.services,0);
});
test('reject inappropriate byte caps',async()=>{
 const {server,stats}=setup();
 await assert.rejects(readRaw331fOnce({server,consent:true,maxDisplayBytes:100}),RangeError);
 assert.equal(stats.services,0);
});
test('empty read returns explicit empty marker',async()=>{
 const {server}=setup([]);
 const r=await readRaw331fOnce({server,consent:true});
 assert.equal(r.hex,'(empty)');assert.equal(r.returnedLength,0);
});
