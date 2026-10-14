import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeTime, commandPacket, packImage, imagePackets, COMMAND } from '../src/protocol.mjs';

test('Unix seconds use big-endian byte order', () => {
  assert.deepEqual([...encodeTime(new Date('2026-10-14T04:49:00.000Z'))], [0x6A,0xCF,0x09,0xBC]);
});
test('mode packets have appropriate command bytes', () => {
  assert.deepEqual([...commandPacket(COMMAND.MODE,[1])], [0xAE,1]);
  assert.deepEqual([...commandPacket(COMMAND.MODE,[2])], [0xAE,2]);
});
test('black-and-white pixels are packed MSB first', () => {
  const data = new Uint8ClampedArray([
    0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255,
    0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255
  ]);
  assert.deepEqual([...packImage({width:8,height:1,data},false).mono],[0x55]);
});
test('red plane uses inverse mask', () => {
  const pixels=[[255,0,0],[0,0,0],...Array.from({length:6},()=>[255,255,255])];
  const data=new Uint8ClampedArray(pixels.flatMap(p=>[...p,255]));
  const image=packImage({width:8,height:1,data},true);
  assert.deepEqual([...image.mono],[0x3f]);
  assert.deepEqual([...image.red],[0x7f]);
});
test('partial row pads final bits white', () => {
  const image=packImage({width:2,height:1,data:new Uint8ClampedArray([0,0,0,255,0,0,0,255])},true);
  assert.deepEqual([...image.mono],[0x3f]);
  assert.deepEqual([...image.red],[0xff]);
});
test('first and continuation image packets have correct flags', () => {
  const bytes=Uint8Array.from({length:30},(_,i)=>i);
  const mono=[...imagePackets(bytes,'mono',20)];
  const red=[...imagePackets(bytes,'red',20)];
  assert.equal(mono.length,2);
  assert.equal(mono[0].length,20);
  assert.deepEqual([...mono[0].slice(0,2)],[0xA1,0x0F]);
  assert.deepEqual([...mono[1].slice(0,2)],[0xA1,0xFF]);
  assert.deepEqual([...red[0].slice(0,2)],[0xA1,0x00]);
  assert.deepEqual([...red[1].slice(0,2)],[0xA1,0xF0]);
});
