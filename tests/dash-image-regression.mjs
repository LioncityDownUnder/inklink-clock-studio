/** Offline regression tests for NRF- image encoding. Run: node tests/dash-image-regression.mjs
 * No Bluetooth access and no device writes.
 */
import assert from 'node:assert/strict';
import { packDashImage, dashImagePackets, createDashTransferPlan, DASH_IMAGE_PROFILES } from '../src/dash-image.mjs';

function solid(width,height,rgb) {
  const data=new Uint8Array(width*height*4);
  for(let i=0;i<data.length;i+=4)data.set([...rgb,255],i);
  return {width,height,data};
}
function patterned(width,height,at) {
  const data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([...at(x,y),255],(y*width+x)*4);
  return {width,height,data};
}
let count=0;
function check(name,fn){fn();console.log('PASS',name);count++;}
const BLACK=[0,0,0],WHITE=[255,255,255],RED=[255,0,0];
for(const p of DASH_IMAGE_PROFILES) {
  check(p.name+' white plane',()=>{
    const v=packDashImage(solid(p.width,p.height,WHITE));
    assert.equal(v.bw.length,p.width*p.height/8);
    assert.ok(v.bw.every(b=>b===255));
    if(p.red)assert.ok(v.red.every(b=>b===0));
    else assert.equal(v.red,null);
  });
  check(p.name+' black plane',()=>{
    const v=packDashImage(solid(p.width,p.height,BLACK));
    assert.ok(v.bw.every(b=>b===0));
    if(p.red)assert.ok(v.red.every(b=>b===0));
  });
  if(p.red)check(p.name+' red plane',()=>{
    const v=packDashImage(solid(p.width,p.height,RED));
    assert.ok(v.bw.every(b=>b===0));
    assert.ok(v.red.every(b=>b===255));
  });
  else check(p.name+' rejects red',()=>assert.throws(()=>packDashImage(solid(p.width,p.height,RED)),/Red pixel/));
  check(p.name+' transfer framing',()=>{
    const plan=createDashTransferPlan(solid(p.width,p.height,WHITE));
    const expected=Math.ceil(plan.bwBytes/240)+(p.red?Math.ceil(plan.redBytes/240):0);
    assert.equal(plan.packetCount,expected);
    assert.ok(plan.packets.every(pkt=>pkt.length>=5&&pkt.length<=244));
    assert.equal(plan.refreshCommand[0],p.refresh);
    const first=plan.packets[0];
    assert.equal(first[1],255);assert.equal(first[2],0);assert.equal(first[3],0);
    if(p.red)assert.equal(plan.packets[Math.ceil(plan.bwBytes/240)][1],0);
  });
}
check('reverse-column order: rightmost pixel first',()=>{
  const p=DASH_IMAGE_PROFILES.find(p=>p.order==='reverse-columns');
  const v=packDashImage(patterned(p.width,p.height,(x,y)=>x===p.width-1&&y===0?WHITE:BLACK));
  assert.equal(v.bw[0],0x80);
});
check('row order: top-left pixel first',()=>{
  const p=DASH_IMAGE_PROFILES.find(p=>p.order==='rows');
  const v=packDashImage(patterned(p.width,p.height,(x,y)=>x===0&&y===0?WHITE:BLACK));
  assert.equal(v.bw[0],0x80);
});
check('packet offsets and plane flag',()=>{
  const plane=new Uint8Array(500);
  const pkts=[...dashImagePackets(plane,'red')];
  assert.deepEqual(pkts.map(p=>p.length),[244,244,24]);
  assert.deepEqual(pkts.map(p=>[...p.slice(0,4)]),[[3,0,0,0],[3,0,0,240],[3,0,1,224]]);
});
check('opcode 04 for 3500 and 9000 byte planes',()=>{
  for(const n of [3500,9000])assert.equal([...dashImagePackets(new Uint8Array(n))][0][0],4);
});
check('invalid palette and unsupported size fail closed',()=>{
  const bad=solid(400,300,[10,10,10]);
  assert.throws(()=>packDashImage(bad),/quantize/);
  assert.throws(()=>packDashImage(solid(8,8,WHITE)),/No verified/);
});
console.log(count+' offline regression checks passed');
