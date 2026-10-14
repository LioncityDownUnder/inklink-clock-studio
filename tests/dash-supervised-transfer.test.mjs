import test from 'node:test';
import assert from 'node:assert/strict';
import {transferDashImageSupervised,ImageTransferAbortedError} from '../src/dash-supervised-transfer.mjs';
const plan={packets:[
 Uint8Array.from([3,255,0,0,255]),
 Uint8Array.from([3,255,0,1,0]),
 Uint8Array.from([3,0,0,0,255])
],refreshCommand:Uint8Array.of(1)};
const valid={plan,audit:{passed:true},isConnected:()=>true,consent:true,refreshDelayMs:0};
test('explicit consent required before any writes',async()=>{
 let n=0;await assert.rejects(transferDashImageSupervised({...valid,consent:false,write:async()=>{n++}}),/consent/);assert.equal(n,0);
});
test('offline audit required before any writes',async()=>{
 let n=0;await assert.rejects(transferDashImageSupervised({...valid,audit:{passed:false},write:async()=>{n++}}),/audit/);assert.equal(n,0);
});
test('success writes all image packets in order, then single refresh',async()=>{
 const writes=[],stages=[];
 const result=await transferDashImageSupervised({...valid,write:async p=>writes.push([...p]),onProgress:p=>stages.push(p.stage)});
 assert.deepEqual(writes,[[3,255,0,0,255],[3,255,0,1,0],[3,0,0,0,255],[1]]);
 assert.equal(result.completed,3);assert.equal(result.refreshWriteAcknowledged,true);
 assert.equal(result.physicalDisplayVerified,false);
 assert.equal(stages.at(-1),'refresh-write-acknowledged');
});
test('failed acknowledged packet blocks refresh and retries',async()=>{
 const writes=[];
 await assert.rejects(transferDashImageSupervised({...valid,write:async p=>{writes.push(p[0]);if(writes.length===2)throw Error('link lost')}}),/link lost/);
 assert.deepEqual(writes,[3,3]);assert.equal(writes.includes(1),false);
});
test('disconnection after first packet stops before next',async()=>{
 let connected=true;const writes=[];
 await assert.rejects(transferDashImageSupervised({...valid,isConnected:()=>connected,write:async p=>{writes.push(p[0]);connected=false}}),ImageTransferAbortedError);
 assert.deepEqual(writes,[3]);
});
test('abort signal during transfer prevents further image writes or refresh',async()=>{
 const controller=new AbortController(),writes=[];
 await assert.rejects(transferDashImageSupervised({...valid,signal:controller.signal,write:async p=>{writes.push(p[0]);controller.abort()}}),ImageTransferAbortedError);
 assert.deepEqual(writes,[3]);
});
test('abort after all image packets prevents final refresh',async()=>{
 const controller=new AbortController(),writes=[];
 await assert.rejects(transferDashImageSupervised({...valid,signal:controller.signal,write:async p=>{writes.push(p[0]);if(writes.length===3)controller.abort()}}),ImageTransferAbortedError);
 assert.deepEqual(writes,[3,3,3]);
});
test('no write callback and invalid delay rejected',async()=>{
 await assert.rejects(transferDashImageSupervised({...valid}),/callbacks/);
 await assert.rejects(transferDashImageSupervised({...valid,write:async()=>{},gapMs:-1}),RangeError);
});
