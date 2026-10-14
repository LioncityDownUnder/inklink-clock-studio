import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeTime, commandPacket, packImage, imagePackets, COMMAND, encodeDashTime, encodeDashMode, DASH_REFRESH, DASH_EPD_SERVICE_UUID, DASH_RXTX_SERVICE_UUID } from '../src/protocol.mjs';

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

test('NRF- clock uses the services discovered on the actual device', () => {
  assert.equal(DASH_EPD_SERVICE_UUID, '13187b10-eba9-a3ba-044e-83d3217d9a38');
  assert.equal(DASH_RXTX_SERVICE_UUID, '00001f10-0000-1000-8000-00805f9b34fb');
});
test('NRF- time packet matches XLY95 main-page DD protocol', () => {
  const date = new Date(2026, 9, 14, 14, 49, 0);
  const encoded = encodeDashTime(date);
  const localSeconds = Math.round(date.getTime() / 1000) - date.getTimezoneOffset() * 60;
  assert.equal(encoded.length, 10);
  assert.equal(encoded[0], 0xDD);
  assert.deepEqual([...encoded.slice(1, 5)], [
    (localSeconds >>> 24) & 0xff, (localSeconds >>> 16) & 0xff,
    (localSeconds >>> 8) & 0xff, localSeconds & 0xff,
  ]);
  assert.deepEqual([...encoded.slice(5)], [0x07, 0xEA, 10, 14, date.getDay() || 7]);
});
test('NRF- clock and calendar mode have distinct E1 commands', () => {
  assert.deepEqual([...encodeDashMode(1)], [0xE1, 0x02]);
  assert.deepEqual([...encodeDashMode(2)], [0xE1, 0x01]);
  assert.deepEqual([...DASH_REFRESH], [0xE2]);
  assert.throws(() => encodeDashMode(3), RangeError);
});
