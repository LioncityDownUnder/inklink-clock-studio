import test from 'node:test';
import assert from 'node:assert/strict';
import {createUploadRehearsal} from '../src/upload-rehearsal.mjs';
const plan={packets:[new Uint8Array(244)],packetCount:126,maxPacketBytes:244,transmissionBytes:30504};
test('unvalidated audit blocks rehearsal',()=>{const p=createUploadRehearsal(plan,{passed:false});assert.equal(p.ready,false)});
test('minimum 247 assumed MTU allows dry-run but never authorizes writes',()=>{const p=createUploadRehearsal(plan,{passed:true},{assumedMtu:247});assert.equal(p.ready,true);assert.equal(p.uploadAuthorized,false);assert.equal(p.hardwareWriteCapacityVerified,false);assert.equal(p.rollbackVerified,false);assert.equal(p.dryRunOnly,true)});
test('MTU below capacity blocks packet plan',()=>{const p=createUploadRehearsal(plan,{passed:true},{assumedMtu:23});assert.equal(p.ready,false);assert.match(p.reasons.join(' '),/MTU/)});
test('rehearsal instructions never recommend blind resume',()=>{const p=createUploadRehearsal(plan,{passed:true});assert.match(p.steps.join(' '),/never automatically resume/i)});
