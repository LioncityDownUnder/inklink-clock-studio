import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFirstHardwareTrial} from '../src/first-trial-readiness.mjs';
const plan={packetCount:126,transmissionBytes:30504};
test('risk acceptance never authorizes a device write',()=>{
 const x=prepareFirstHardwareTrial({plan,audit:{passed:true}});
 assert.equal(x.physicalUploadEnabled,false);assert.equal(x.approvedToSendNow,false);
 assert.equal(x.hardwareReady,false);
});
test('missing Chrome write capacity and rollback explicitly remain blocked',()=>{
 const x=prepareFirstHardwareTrial({plan,audit:{passed:true},panelProfileConfirmed:true,acknowledgedWriteAvailable:true});
 assert.deepEqual(x.checks.filter(c=>!c.passed).map(c=>c.name),
 ['Chrome 244-byte write acceptance','Interrupted-image recovery procedure validated']);
});
test('even all review checks passing never turns on physical upload',()=>{
 const x=prepareFirstHardwareTrial({plan,audit:{passed:true},panelProfileConfirmed:true,acknowledgedWriteAvailable:true,browserWriteSizeVerified:true,recoveryVerified:true});
 assert.equal(x.hardwareReady,true);assert.equal(x.physicalUploadEnabled,false);assert.equal(x.approvedToSendNow,false);
});
test('invalid image plan does not produce ready state',()=>{
 const x=prepareFirstHardwareTrial({audit:{passed:true},panelProfileConfirmed:true,acknowledgedWriteAvailable:true,browserWriteSizeVerified:true,recoveryVerified:true});
 assert.equal(x.hardwareReady,false);
});
