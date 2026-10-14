import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASH_IMAGE_PROFILES, DASH_DATA_BYTES_PER_PACKET, getDashImageProfile,
  packDashImage, dashImagePackets, createDashTransferPlan
} from '../src/dash-image.mjs';

const WHITE=[255,255,255,255],BLACK=[0,0,0,255],RED=[255,0,0,255];
const makeImage=(width,height,edits=[])=>{
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++)data.set(WHITE,i*4);
  for(const [x,y,c] of edits)data.set(c,(y*width+x)*4);
  return {width,height,data};
};

test('supported size profiles match source and partial-refresh selection',()=>{
  assert.equal(DASH_IMAGE_PROFILES.length,7);
  assert.equal(getDashImageProfile(400,300).order,'rows');
  assert.equal(getDashImageProfile(296,128).order,'reverse-columns');
  assert.equal(getDashImageProfile(280,100).refresh,0xAA);
  assert.equal(getDashImageProfile(400,180).refresh,0xAA);
  assert.equal(getDashImageProfile(212,128).red,false);
  assert.equal(getDashImageProfile(250,128).red,false);
  assert.equal(getDashImageProfile(122,250),null);
});

test('400x300 row-major BW=white and BWR=red-positive pixels, MSB first',()=>{
  const img=makeImage(400,300,[
    [1,0,BLACK],[2,0,RED],[4,0,BLACK],[5,0,RED]
  ]);
  const {bw,red}=packDashImage(img);
  assert.equal(bw.length,15000);
  assert.equal(red.length,15000);
  assert.equal(bw[0],0x93); // pixels: white black red white black red white white
  assert.equal(red[0],0x24); // red positions: 2 and 5
  assert.equal(bw[1],0xff);
  assert.equal(red[1],0x00);
});

test('296x128 and 212x128 use reversed-x columns, then top-to-bottom',()=>{
  const p=packDashImage(makeImage(296,128,[[295,0,BLACK],[0,0,RED]]));
  assert.equal(p.bw.length,4736);
  assert.equal(p.bw[0],0x7f);
  assert.equal(p.red[0],0);
  assert.equal(p.bw[4736-16],0x7f);
  assert.equal(p.red[4736-16],0x80);
  const mono=packDashImage(makeImage(212,128,[[211,0,BLACK]]));
  assert.equal(mono.bw[0],0x7f);
  assert.equal(mono.red,null);
  assert.equal(mono.bw.length,3392);
});

test('reject unquantized shades, transparency and red on monochrome profile',()=>{
  const bad=makeImage(400,300,[[0,0,[19,29,42,255]]]);
  assert.throws(()=>packDashImage(bad),/quantize canvas/);
  assert.throws(()=>packDashImage(makeImage(400,300,[[0,0,[255,255,255,0]]])),/quantize canvas/);
  assert.throws(()=>packDashImage(makeImage(250,128,[[0,0,RED]])),/Red pixel not supported/);
  assert.throws(()=>packDashImage(makeImage(122,250)),/No verified upstream NRF-/);
});

test('03 FF 0000 BW packet, 03 00 00f0 red packet, 240 bytes data',()=>{
  const plane=new Uint8Array(500);
  plane[0]=0x11;plane[240]=0x22;plane[499]=0x33;
  const chunks=[...dashImagePackets(plane,'bw')];
  assert.equal(DASH_DATA_BYTES_PER_PACKET,240);
  assert.deepEqual(chunks.map(x=>x.length),[244,244,24]);
  assert.deepEqual([...chunks[0].slice(0,5)],[3,255,0,0,0x11]);
  assert.deepEqual([...chunks[1].slice(0,5)],[3,255,0,240,0x22]);
  assert.deepEqual([...chunks[2].slice(0,4)],[3,255,1,224]);
  assert.equal(chunks[2].at(-1),0x33);
  const reds=[...dashImagePackets(plane,'red')];
  assert.deepEqual([...reds[0].slice(0,4)],[3,0,0,0]);
  assert.deepEqual([...reds[1].slice(0,4)],[3,0,0,240]);
});

test('04 packet selector for partial image sizes 3500 and 9000 bytes only',()=>{
  for(const n of [3500,9000]){
    const packet=dashImagePackets(new Uint8Array(n),'bw').next().value;
    assert.deepEqual([...packet.slice(0,4)],[4,255,0,0]);
  }
  assert.deepEqual([...dashImagePackets(new Uint8Array(4000),'bw').next().value.slice(0,4)],[3,255,0,0]);
  assert.deepEqual([...dashImagePackets(new Uint8Array(4736),'red').next().value.slice(0,4)],[3,0,0,0]);
});

test('plan computes 400x300 packets and EPD 01 refresh but never transmits',()=>{
  const plan=createDashTransferPlan(makeImage(400,300));
  assert.equal(plan.bwBytes,15000);
  assert.equal(plan.redBytes,15000);
  assert.equal(plan.imageBytes,30000);
  assert.equal(plan.packetCount,126);
  assert.equal(plan.transmissionBytes,30504);
  assert.equal(plan.maxPacketBytes,244);
  assert.deepEqual([...plan.packets[0].slice(0,4)],[3,255,0,0]);
  assert.deepEqual([...plan.packets[63].slice(0,4)],[3,0,0,0]);
  assert.deepEqual([...plan.refreshCommand],[1]);
});

test('partial images use AA and 04 packets; mono profiles have one plane',()=>{
  const small=createDashTransferPlan(makeImage(280,100));
  assert.equal(small.imageBytes,7000);
  assert.equal(small.packetCount,30);
  assert.equal(small.refreshCommand[0],0xAA);
  assert.equal(small.packets[0][0],0x04);
  const mono=createDashTransferPlan(makeImage(250,128));
  assert.equal(mono.imageBytes,4000);
  assert.equal(mono.redBytes,0);
  assert.equal(mono.packetCount,17);
  assert.equal(mono.refreshCommand[0],0x01);
});

test('full 800x480 profile offset remains inside 16 bits',()=>{
  const plan=createDashTransferPlan(makeImage(800,480));
  assert.equal(plan.bwBytes,48000);
  assert.equal(plan.redBytes,48000);
  assert.equal(plan.packetCount,400);
  assert.equal(plan.packets[199][2],0xBA);
  assert.equal(plan.packets[199][3],0xB0);
});

test('invalid plane inputs cannot produce packets',()=>{
  assert.throws(()=>[...dashImagePackets(new Uint8Array(), 'bw')],RangeError);
  assert.throws(()=>[...dashImagePackets(new Uint8Array(65536),'red')],RangeError);
  assert.throws(()=>[...dashImagePackets(new Uint8Array(8),'green')],RangeError);
  assert.throws(()=>packDashImage({width:400,height:300,data:new Uint8Array(4)}),TypeError);
});
