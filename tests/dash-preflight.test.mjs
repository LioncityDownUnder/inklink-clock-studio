import test from 'node:test';
import assert from 'node:assert/strict';
import {createDashTransferPlan} from '../src/dash-image.mjs';
import {auditDashSequence} from '../src/dash-preflight.mjs';
const image={width:400,height:300,data:new Uint8ClampedArray(400*300*4)};
for(let i=0;i<image.data.length;i+=4)image.data.set([255,255,255,255],i);
const plan=createDashTransferPlan(image);
test('valid 400x300 sequence passes MTU 247 audit',()=>{
 const x=auditDashSequence(plan,{attMtu:247});
 assert.equal(x.passed,true);assert.equal(x.verifiedPacketCount,126);assert.equal(x.verifiedImageBytes,30000);
 assert.match(x.finalOperation,/01/);assert.match(x.safety,/OFFLINE/);
});
test('MTU 23 blocks 244-byte frames',()=>{
 const x=auditDashSequence(plan,{attMtu:23});
 assert.equal(x.passed,false);assert.match(x.failures[0],/Packet exceeds/);
});
test('broken offset detected without any I/O',()=>{
 const packets=plan.packets.map(p=>p.slice());packets[2][3]^=1;
 const x=auditDashSequence({...plan,packets});assert.equal(x.passed,false);assert.match(x.failures.join(' '),/Offset mismatch/);
});
test('missing red plane detected',()=>{
 const x=auditDashSequence({...plan,packets:plan.packets.slice(0,63)});
 assert.equal(x.passed,false);assert.match(x.failures.join(' '),/Missing red plane|byte count/i);
});
test('incorrect refresh detected and invalid MTU rejected',()=>{
 const x=auditDashSequence({...plan,refreshCommand:Uint8Array.of(0xE2)});
 assert.equal(x.passed,false);assert.match(x.failures.join(' '),/refresh/);
 assert.throws(()=>auditDashSequence(plan,{attMtu:20}),RangeError);
});
