import test from 'node:test';
import assert from 'node:assert/strict';
import {runMockSupervisedTransfer} from '../src/mock-transfer-runner.mjs';
const plan={packets:[Uint8Array.from([3,255,0,0,255]),Uint8Array.from([3,255,0,1,0]),Uint8Array.from([3,0,0,0,0])],refreshCommand:Uint8Array.of(1)};
const defaults={plan,audit:{passed:true},delayMs:0};
test('mock success reports acknowledged refresh but no physical proof',async()=>{
 const stages=[];const result=await runMockSupervisedTransfer({...defaults,onProgress:p=>stages.push(p.stage)});
 assert.equal(result.completed,3);assert.equal(result.refreshWriteAcknowledged,true);
 assert.equal(result.physicalDisplayVerified,false);assert.equal(stages.at(-1),'refresh-write-acknowledged');
});
test('mock failure at packet two aborts before EPD refresh',async()=>{
 const events=[];await assert.rejects(runMockSupervisedTransfer({...defaults,failAtPacket:2,onProgress:p=>events.push(p.stage)}),/SIMULATED packet failure at 2/);
 assert.equal(events.includes('refreshing'),false);assert.equal(events.at(-1),'stopped-incomplete-or-unknown');
});
test('mock cancellation blocks later packets and refresh',async()=>{
 const controller=new AbortController();const stages=[];
 await assert.rejects(runMockSupervisedTransfer({...defaults,signal:controller.signal,onProgress:p=>{
 stages.push(p.stage);if(p.stage==='image')controller.abort();
 }}));
 assert.equal(stages.includes('refreshing'),false);
});
test('invalid failure numbers rejected before mock writes',async()=>{
 await assert.rejects(runMockSupervisedTransfer({...defaults,failAtPacket:0}),RangeError);
 await assert.rejects(runMockSupervisedTransfer({...defaults,delayMs:-1}),RangeError);
});
