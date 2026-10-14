import test from 'node:test';
import assert from 'node:assert/strict';
import {createPendingWriteMonitor} from '../src/pending-write-monitor.mjs';
test('pending write emits warning once without claiming cancellation',()=>{
 let time=0;const statuses=[];
 const m=createPendingWriteMonitor({warnAfterMs:1000,now:()=>time,onStatus:x=>statuses.push(x.status)});
 m.begin(25);time=900;assert.equal(m.inspect().status,'pending');time=1200;
 assert.equal(m.inspect().status,'still-pending-after-warning');
 m.inspect();assert.deepEqual(statuses,['pending','stalled-warning']);
 assert.equal(m.pending,true);time=1300;m.finish(true);
 assert.equal(m.pending,false);assert.deepEqual(statuses,['pending','stalled-warning','resolved']);
});
test('failure resolves pending state and future packets can be observed separately',()=>{
 let t=10;const m=createPendingWriteMonitor({now:()=>t,warnAfterMs:25});
 m.begin(1);t=40;m.inspect();m.finish(false);assert.equal(m.pending,false);
 m.begin(2);assert.equal(m.inspect().sequence,2);m.finish(true);
});
test('overlapping start fails while earlier write is pending',()=>{
 const m=createPendingWriteMonitor();m.begin(1);
 assert.throws(()=>m.begin(2),/still pending/);m.finish(false);
});
test('invalid state or settings rejected',()=>{
 assert.throws(()=>createPendingWriteMonitor({warnAfterMs:0}),TypeError);
 const m=createPendingWriteMonitor();
 assert.throws(()=>m.begin(0),RangeError);
 assert.throws(()=>m.finish(true),/No write pending/);
});
