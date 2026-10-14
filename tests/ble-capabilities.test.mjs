import test from 'node:test';
import assert from 'node:assert/strict';
import {describeEpdWriteCapabilities} from '../src/ble-capabilities.mjs';
test('disconnected report never offers write',()=>{
 const r=describeEpdWriteCapabilities(null,false);assert.equal(r.status,'not-connected');assert.equal(r.supported,false);
});
test('known writable characteristic reports capability but no MTU claim',()=>{
 const r=describeEpdWriteCapabilities({properties:{write:true,notify:true},writeValueWithResponse(){}},true);
 assert.equal(r.supported,true);assert.match(r.message,/does not provide a negotiated ATT MTU/);
});
test('read-only characteristic is not writable',()=>{
 const r=describeEpdWriteCapabilities({properties:{read:true},readValue(){}},true);assert.equal(r.supported,false);
});
test('legacy acknowledged API is recognized without invoking it',()=>{
 let calls=0;const r=describeEpdWriteCapabilities({properties:{write:true},writeValue(){calls++}},true);
 assert.equal(r.supported,true);assert.equal(calls,0);
});
