import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeGuardedEpdWriter} from '../src/ble-guarded-writer.mjs';
import {transferDashImageSupervised} from '../src/dash-supervised-transfer.mjs';

const plan={packets:[Uint8Array.from([3,255,0,0,1]),Uint8Array.from([3,0,0,0,1])],refreshCommand:Uint8Array.of(1)};
test('whole live adapter integration writes all mock image packets and refresh in order',async()=>{
 const calls=[];
 const ch={properties:{write:true},async writeValueWithResponse(p){calls.push([...p])}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true});
 const result=await transferDashImageSupervised({plan,audit:{passed:true},write:p=>writer.write(p),isConnected:()=>true,consent:true,refreshDelayMs:0});
 assert.deepEqual(calls,[[3,255,0,0,1],[3,0,0,0,1],[1]]);
 assert.equal(result.physicalDisplayVerified,false);
});
test('whole adapter rejects interrupted packet and suppresses refresh',async()=>{
 const calls=[];
 const ch={properties:{write:true},async writeValueWithResponse(p){calls.push(p[0]);if(calls.length===2)throw new Error('GATT link dropped')}};
 const writer=makeGuardedEpdWriter({characteristic:ch,isConnected:()=>true,isVisible:()=>true});
 await assert.rejects(transferDashImageSupervised({plan,audit:{passed:true},write:p=>writer.write(p),isConnected:()=>true,consent:true,refreshDelayMs:0}),/GATT link dropped/);
 assert.deepEqual(calls,[3,3]);assert.equal(writer.getState().blocked,true);
});
test('live app requires typed acknowledgement and manual native confirmation',async()=>{
 const source=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8');
 assert.match(source,/liveUploadConfirmText[^\n]*value\.trim\(\)==='UPLOAD'/);
 assert.match(source,/const proceed=confirm\(/);
 assert.match(source,/if\(!proceed\)return;/);
 assert.match(source,/liveUploadAttempted=true/);
 assert.match(source,/liveUploadStart'\)\.addEventListener\('click',startLiveUpload/);
 assert.match(source,/if \(state\.profile === 'dash'\) \{[\s\S]*?image upload is temporarily disabled/);
 assert.doesNotMatch(source,/setInterval\([^)]*startLiveUpload/);
});
test('live page labels the hardware trial separately from mock consent',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/FIRST LIVE IMAGE UPLOAD — ONE ATTEMPT ONLY/);
 assert.match(html,/id="liveUploadRisk"/);
 assert.match(html,/id="liveUploadConfirmText"/);
 assert.match(html,/id="liveUploadStart"[^>]*disabled/);
 assert.match(html,/id="mockUploadConsent"/);
});
