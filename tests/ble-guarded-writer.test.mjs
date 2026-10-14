import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGuardedEpdWriter,TransferGuardError} from '../src/ble-guarded-writer.mjs';
const make=(options={})=>{
 let calls=0;
 const ch={properties:{write:true},async writeValueWithResponse(){calls++}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true,now:()=>100,writeStartTime:0,deadlineMs:1000,...options});
 return {writer,count:()=>calls};
};
test('acknowledged write only: no-write or no-response-only forbidden',()=>{
 assert.throws(()=>makeGuardedEpdWriter({characteristic:{properties:{writeWithoutResponse:true}},isConnected:()=>true,isVisible:()=>true}),TransferGuardError);
});
test('sequential mock characteristic write returns count',async()=>{
 const {writer,count}=make();await writer.write(Uint8Array.of(1,2,3));
 assert.equal(count(),1);assert.equal(writer.getState().writeCount,1);
});
test('cancellation before first write makes zero calls',async()=>{
 const controller=new AbortController();controller.abort();const {writer,count}=make({signal:controller.signal});
 await assert.rejects(writer.write(Uint8Array.of(3)),/cancelled/);assert.equal(count(),0);
});
test('backgrounded page and lost link deny writes',async()=>{
 for(const props of [{isVisible:()=>false},{isConnected:()=>false}]){
  const {writer,count}=make(props);
  await assert.rejects(writer.write(Uint8Array.of(3)),TransferGuardError);
  assert.equal(count(),0);
 }
});
test('deadline denies writes before any characteristic operation',async()=>{
 const {writer,count}=make({now:()=>1000,deadlineMs:500});
 await assert.rejects(writer.write(Uint8Array.of(3)),/time budget/);assert.equal(count(),0);
});
test('pending write cancellation waits for resolution, blocks later writes',async()=>{
 let resolveWrite,calls=0;
 const c=new AbortController();
 const ch={properties:{write:true},writeValueWithResponse(){calls++;return new Promise(resolve=>{resolveWrite=resolve})}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true,signal:c.signal});
 const first=writer.write(Uint8Array.of(3));
 c.abort();resolveWrite();
 await assert.rejects(first,/cancelled/);
 await assert.rejects(writer.write(Uint8Array.of(1)),/blocked/);
 assert.equal(calls,1);assert.equal(writer.getState().pending,false);
});
test('rejected characteristic write stops all future writes',async()=>{
 let calls=0;const ch={properties:{write:true},async writeValueWithResponse(){calls++;throw Error('GATT dropped')}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true});
 await assert.rejects(writer.write(Uint8Array.of(3)),/GATT dropped/);
 await assert.rejects(writer.write(Uint8Array.of(1)),/blocked/);assert.equal(calls,1);
});
test('concurrent write denied during outstanding write',async()=>{
 let finish;const ch={properties:{write:true},writeValueWithResponse(){return new Promise(r=>finish=r)}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true});
 const p=writer.write(Uint8Array.of(3));
 await assert.rejects(writer.write(Uint8Array.of(4)),/Concurrent/);
 finish();await p;
});
