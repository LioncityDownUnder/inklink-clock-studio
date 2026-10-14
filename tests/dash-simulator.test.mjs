import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateDashTransfer} from '../src/dash-simulator.mjs';
import {createDashTransferPlan} from '../src/dash-image.mjs';
const image={width:400,height:300,data:new Uint8ClampedArray(400*300*4)};
for(let i=0;i<image.data.length;i+=4) image.data.set([255,255,255,255],i);
const plan=createDashTransferPlan(image);
test('baseline 200ms packets has 29.2s including 4s refresh',()=>{
 const v=simulateDashTransfer(plan);
 assert.equal(v.packets,126); assert.equal(v.characteristicLimit,244);
 assert.equal(v.estimatedTotalSeconds,29.2); assert.equal(v.feasibleWithinScenario,true);
 assert.equal(v.stopsAt,'complete'); assert.match(v.mode,/zero Bluetooth writes/);
});
test('slow link models interrupted frame and does not offer blind resume',()=>{
 const v=simulateDashTransfer(plan,{millisecondsPerPacket:600,disconnectAfterSeconds:50});
 assert.equal(v.stopsAt,'image'); assert.equal(v.estimatedCompletePackets,83);
 assert.equal(v.feasibleWithinScenario,false);assert.match(v.restartRecommendation,/do not resume blindly/);
});
test('short deadline can interrupt refresh after image packets',()=>{
 const v=simulateDashTransfer(plan,{millisecondsPerPacket:100,disconnectAfterSeconds:13,refreshMilliseconds:3000});
 assert.equal(v.stopsAt,'refresh');assert.equal(v.estimatedCompletePackets,126);
});
test('insufficient MTU blocks the full frame',()=>{
 const v=simulateDashTransfer(plan,{mtu:23});
 assert.equal(v.stopsAt,'mtu'); assert.equal(v.oversizePacketIndex,0);
 assert.equal(v.estimatedCompletePackets,0);
 assert.equal(v.feasibleWithinScenario,false);
});
test('boundary completion and start delay are deterministic',()=>{
 const exact=simulateDashTransfer(plan,{millisecondsPerPacket:200,disconnectAfterSeconds:29.2});
 assert.equal(exact.feasibleWithinScenario,true);
 const late=simulateDashTransfer(plan,{millisecondsPerPacket:200,disconnectAfterSeconds:29.2,startDelayMilliseconds:100});
 assert.equal(late.stopsAt,'refresh');
});
test('invalid inputs never produce a simulation',()=>{
 assert.throws(()=>simulateDashTransfer({packets:[]}),TypeError);
 assert.throws(()=>simulateDashTransfer(plan,{mtu:22}),RangeError);
 assert.throws(()=>simulateDashTransfer(plan,{millisecondsPerPacket:0}),RangeError);
 assert.throws(()=>simulateDashTransfer(plan,{disconnectAfterSeconds:-1}),RangeError);
});
