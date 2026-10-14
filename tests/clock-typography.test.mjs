import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapFooterText,getClockLayout} from '../src/clock-typography.mjs';
test('large footer wraps into readable two lines',()=>{
 assert.deepEqual(wrapFooterText('A GOOD DAY TO GET THINGS DONE',28,2),['A GOOD DAY TO GET THINGS','DONE']);
});
test('short footer stays on one line',()=>{
 assert.deepEqual(wrapFooterText('SYDNEY',29,2),['SYDNEY']);
});
test('long footer is not silently truncated',()=>{
 const message='THIS MESSAGE IS LONG ENOUGH TO REQUIRE MORE THAN TWO LINES OF TEXT';
 assert.deepEqual(wrapFooterText(message,12,2),[message]);
});
test('high-contrast layout offers larger black lettering than legacy for 400x300',()=>{
 const old=getClockLayout(400,300,false),current=getClockLayout(400,300,true);
 assert.ok(current.footerSize>old.footerSize);
 assert.equal(current.footerInk,'#000000');assert.equal(current.footerMaxLines,2);
});
test('invalid canvas/layout bounds are rejected',()=>{
 assert.throws(()=>getClockLayout(0,300,true),RangeError);
 assert.throws(()=>wrapFooterText('Hi',4,2),RangeError);
});
