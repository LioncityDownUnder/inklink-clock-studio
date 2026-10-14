import { SERVICE_UUID, CHARACTERISTIC_UUID, COMMAND, SCREEN_SIZES, encodeTime, commandPacket, packImage, imagePackets, bytesToHex } from './protocol.mjs';

const $ = id => document.getElementById(id);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = {
  device: null, characteristic: null, notifications: false,
  busy: false, logCount: 0, loadedImage: null, previewTime: null,
};

function toast(message, error = false) {
  const box = $('toast');
  box.textContent = message;
  box.classList.toggle('error', error);
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { box.hidden = true; }, 5200);
}

function log(message, level = 'info') {
  state.logCount++;
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  const parts = [new Date().toLocaleTimeString('en-AU', {hour12: false}), level.toUpperCase(), message];
  for (const [i, text] of parts.entries()) {
    const span = document.createElement('span');
    span.className = ['log-time','log-level','log-text'][i];
    span.textContent = text;
    entry.appendChild(span);
  }
  const list = $('logEntries');
  list.appendChild(entry);
  if (list.children.length > 200) list.firstElementChild.remove();
  list.scrollTop = list.scrollHeight;
  $('logCount').textContent = `${state.logCount} event${state.logCount === 1 ? '' : 's'}`;
}

function connected() {
  return Boolean(state.device?.gatt?.connected && state.characteristic);
}
function updateUi() {
  const online = connected();
  const pill = $('connectionPill');
  pill.classList.toggle('connected', online);
  pill.classList.toggle('disconnected', !online);
  pill.innerHTML = `<span class="pill-dot"></span> ${online ? 'Connected' : 'Disconnected'}`;
  $('deviceName').textContent = online ? (state.device.name || 'Unnamed BLE clock') : 'No clock connected';
  $('deviceHint').textContent = online ? 'XLY95-compatible BLE service found' : 'Looking for nearby NRF_ devices';
  for (const button of document.querySelectorAll('[data-requires-connection]')) button.disabled = !online || state.busy;
  $('mainConnect').disabled = online || state.busy;
  $('topConnect').disabled = state.busy;
  $('topConnect').textContent = online ? 'Disconnect clock' : 'Connect clock ↗';
  $('disconnectBtn').disabled = !online || state.busy;
  $('allDevices').disabled = online || state.busy;
  $('packetSize').disabled = state.busy;
  $('ackInterval').disabled = state.busy;
}

function setBusy(value) {
  state.busy = value;
  updateUi();
}

async function runAction(title, work) {
  if (state.busy) return;
  setBusy(true);
  try {
    await work();
    log(`${title}: command completed`, 'success');
    toast(`${title} sent successfully`);
  } catch (error) {
    log(`${title}: ${error.message || error}`, 'error');
    toast(`${title}: ${error.message || error}`, true);
  } finally {
    setBusy(false);
  }
}

function onDisconnect() {
  state.characteristic = null;
  state.notifications = false;
  state.busy = false;
  updateUi();
  log('Bluetooth device disconnected', 'info');
}

async function connectClock() {
  if (connected()) return;
  if (!navigator.bluetooth) {
    toast('Web Bluetooth is unavailable in this browser. Use Chrome/Edge on desktop or Chrome on Android.', true);
    return;
  }
  if (!window.isSecureContext) {
    toast('Web Bluetooth requires HTTPS or localhost.', true);
    return;
  }
  if (state.busy) return;
  setBusy(true);
  try {
    // The original XLY95 page matches NRF_ names and requests this exact service.
    const options = $('allDevices').checked
      ? {acceptAllDevices: true, optionalServices: [SERVICE_UUID]}
      : {filters: [{namePrefix: 'NRF_'}], optionalServices: [SERVICE_UUID]};
    const device = await navigator.bluetooth.requestDevice(options);
    state.device = device;
    state.device.addEventListener('gattserverdisconnected', onDisconnect);
    log(`Selected ${device.name || 'unnamed BLE device'}`);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    state.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    try {
      await state.characteristic.startNotifications();
      state.notifications = true;
      state.characteristic.addEventListener('characteristicvaluechanged', evt => {
        const data = evt.target.value;
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        log(`RX ${bytesToHex(bytes)}`);
      });
    } catch (error) {
      log(`Notifications not enabled: ${error.message || error}. Other controls may still work.`);
    }
    log(`Connected to ${device.name || 'BLE clock'}; service and characteristic found`, 'success');
    try {
      await send(commandPacket(COMMAND.INFO), true);
      log('Requested clock information (A9)');
    } catch (error) {
      log(`Information query failed: ${error.message || error}`);
    }
    toast('Your clock is connected!');
  } catch (error) {
    if (error.name === 'NotFoundError') log('No BLE device selected (or selection cancelled)');
    else { log(`Connection failed: ${error.message || error}`, 'error'); toast(`Could not connect: ${error.message || error}`, true); }
    if (state.device?.gatt?.connected) state.device.gatt.disconnect();
    state.characteristic = null;
  } finally {
    setBusy(false);
  }
}

function disconnectClock() {
  if (state.busy) return;
  if (state.device?.gatt?.connected) state.device.gatt.disconnect();
  else onDisconnect();
}

async function send(packet, withResponse = true) {
  if (!connected()) throw new Error('Clock is not connected');
  const characteristic = state.characteristic;
  if (withResponse) {
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await characteristic.writeValueWithResponse(packet);
    } else if (typeof characteristic.writeValue === 'function') {
      await characteristic.writeValue(packet);
    } else {
      throw new Error('Device does not support acknowledged BLE writes');
    }
  } else if (typeof characteristic.writeValueWithoutResponse === 'function') {
    await characteristic.writeValueWithoutResponse(packet);
  } else {
    await send(packet, true);
  }
}

async function syncClock() {
  await runAction('Time sync', async () => {
    const packet = commandPacket(COMMAND.TIME, encodeTime());
    await send(packet);
    log(`TX A3 — current Unix time (4-byte big-endian)`);
  });
}
async function switchMode(mode, label) {
  await runAction(label, async () => {
    await send(commandPacket(COMMAND.MODE, [mode]));
    log(`TX AE ${mode.toString(16).padStart(2,'0').toUpperCase()}`);
  });
}

function setTab(id) {
  if (!$(id)) return;
  for (const section of document.querySelectorAll('.tab-panel')) section.classList.toggle('hidden', section.id !== id);
  for (const button of document.querySelectorAll('[data-tab]')) button.classList.toggle('active', button.dataset.tab === id);
  const names = {overview:'Overview', studio:'Display studio', activity:'Activity log', guide:'Setup guide'};
  $('crumb').textContent = names[id];
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
}

function getScreen() { return SCREEN_SIZES.find(x => x.id === $('screenSize').value) || SCREEN_SIZES[0]; }
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r,w/2,h/2));
}
function fillTextFitted(ctx, text, centerX, y, desiredSize, maxWidth, weight = '800') {
  let font = desiredSize;
  do {
    ctx.font = `${weight} ${font}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || font <= 8) break;
    font -= 1;
  } while (font > 8);
  ctx.textAlign = 'center';
  ctx.fillText(text, centerX, y);
}
function drawClock(ctx, w, h) {
  const portrait = w < h, accent = '#D55243', black = '#192334';
  const title = $('headline').value.trim().toUpperCase() || 'YOUR CLOCK';
  const footer = $('subtitle').value.trim().toUpperCase();
  const now = new Date(); state.previewTime = now;
  ctx.fillStyle = accent; ctx.fillRect(0,0,w,Math.max(5,h*.022));
  ctx.fillStyle = black;
  const side = portrait ? 8 : w*.066;
  const topY = h*(portrait ? .16 : .17);
  ctx.textAlign='left'; ctx.font=`800 ${Math.max(9,Math.round(h*(portrait?.039:.042)))}px Arial`;
  fillTextFitted(ctx, title, w/2, topY, h*(portrait?.041:.047), w-side*2, '800');
  ctx.fillStyle = accent;
  ctx.fillRect(side, topY+9, w-2*side, Math.max(1,h*.004));
  const timeString = new Intl.DateTimeFormat('en-AU', {
    hour:'2-digit',minute:'2-digit',hour12:$('timeFormat').value === '12'
  }).format(now).replace(/\s/g,' ').toUpperCase();
  ctx.fillStyle = black;
  fillTextFitted(ctx, timeString, w/2, h*(portrait?.52:.57), h*(portrait?.22:.275), w-side*1.6,'800');
  const dateString = new Intl.DateTimeFormat('en-AU', {weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now).toUpperCase();
  ctx.fillStyle=accent;
  fillTextFitted(ctx, dateString, w/2, h*(portrait?.66:.73), h*(portrait?.043:.051), w-side*1.5,'750');
  ctx.fillStyle='#3D4650';
  fillTextFitted(ctx, footer, w/2, h*(portrait?.84:.91), h*(portrait?.033:.033), w-side*1.8,'600');
}
function wrappedLines(ctx, text, maxWidth, maxLines = 4) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && ctx.measureText(`${line} ${word}`).width > maxWidth) { lines.push(line); line=word; }
    else line = line ? `${line} ${word}` : word;
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}
function drawMessage(ctx, w, h) {
  const title = $('headline').value.trim() || 'A LITTLE REMINDER';
  const body = $('subtitle').value.trim() || 'Make today count.';
  const side = Math.max(10,w*.07);
  ctx.fillStyle='#D55243'; ctx.fillRect(side,h*.13,w*.20,Math.max(4,h*.013));
  ctx.textAlign='left';ctx.fillStyle='#273447';
  ctx.font=`800 ${Math.max(10,Math.round(Math.min(w*.041,h*.058)))}px Arial`;
  const label = title.toUpperCase();
  fillTextFitted(ctx,label,w/2,h*.27,h*.056,w-side*2,'800');
  const size=Math.max(13,Math.round(Math.min(w*.095,h*.16)));
  ctx.font=`800 ${size}px Arial`;
  const lines=wrappedLines(ctx,body,w-side*2,4);
  const lineHeight = size*1.10;
  const start = h*.56 - (lines.length-1)*lineHeight/2;
  lines.forEach((line,i)=>{ctx.fillStyle='#172337';fillTextFitted(ctx,line,w/2,start+i*lineHeight,size,w-side*2,'800');});
  ctx.fillStyle='#D55243';ctx.fillRect(side,h*.9,w-side*2,Math.max(3,h*.01));
}
function drawUploadedImage(ctx, w, h) {
  const image=state.loadedImage;
  if (!image) {
    ctx.textAlign='center';ctx.fillStyle='#E7EBF0';
    roundedRect(ctx,w*.32,h*.20,w*.36,h*.44,10);ctx.fill();
    ctx.fillStyle='#8A9AAF';fillTextFitted(ctx,'UPLOAD AN IMAGE',w/2,h*.77,h*.053,w*.85,'700');
    return;
  }
  const iw=image.naturalWidth, ih=image.naturalHeight;
  const cover=$('imageFit').value==='cover';
  const factor=cover?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);
  const dw=iw*factor, dh=ih*factor;
  ctx.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh);
}

function quantize(canvas, useDither) {
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,canvas.width,canvas.height);
  const {width,height}=data;
  const rgb=data.data;
  const tri=$('colourMode').value==='tri';
  const pattern=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const r=rgb[i],g=rgb[i+1],b=rgb[i+2];
    const red=tri && r>160 && r>g && r>b;
    const luminance=.299*r+.587*g+.114*b;
    const delta=useDither?(pattern[(y%4)*4+(x%4)]-7.5)*8:0;
    const v=red?[211,82,67]:(luminance>=140+delta?[255,255,255]:[19,29,42]);
    rgb[i]=v[0];rgb[i+1]=v[1];rgb[i+2]=v[2];rgb[i+3]=255;
  }
  ctx.putImageData(data,0,0);
}

function renderPreview() {
  const screen=getScreen();
  const canvas=$('previewCanvas'); canvas.width=screen.width; canvas.height=screen.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);
  const template=$('template').value;
  if(template==='clock')drawClock(ctx,canvas.width,canvas.height);
  else if(template==='message')drawMessage(ctx,canvas.width,canvas.height);
  else drawUploadedImage(ctx,canvas.width,canvas.height);
  quantize(canvas, template==='image' && $('imageDither').checked);
  $('dimensionTag').textContent=`${screen.width} × ${screen.height} PX`;
  $('redLegend').hidden=$('colourMode').value==='mono';
  $('copyFields').classList.toggle('hidden',template==='image');
  $('imageFields').classList.toggle('hidden',template!=='image');
}

async function loadImage(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please choose a supported image file',true);return; }
  if (file.size > 15*1024*1024) { toast('Please use an image smaller than 15 MB',true);return; }
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    await new Promise((resolve,reject)=>{
      image.onload=resolve;image.onerror=()=>reject(new Error('Cannot read this image'));
      image.src=url;
    });
    state.loadedImage=image;
    log(`Loaded ${file.name} (${image.naturalWidth} × ${image.naturalHeight})`);
    renderPreview();
  } catch (e) { toast(e.message,true); }
  finally { URL.revokeObjectURL(url); }
}

function downloadPng() {
  const a=document.createElement('a');
  a.href=$('previewCanvas').toDataURL('image/png');
  a.download=`eink-${getScreen().width}x${getScreen().height}-${$('template').value}.png`;
  document.body.appendChild(a);a.click();a.remove();
  log('Exported current display as PNG');
}

function progress(percent,label){
  $('transferStatus').hidden=false;
  $('transferProgress').value=percent;
  $('transferPct').textContent=`${Math.round(percent)}%`;
  $('transferLabel').textContent=label;
}
async function uploadImage() {
  if (!connected() || state.busy) return;
  if ($('template').value==='image' && !state.loadedImage) {toast('Choose an image file first.',true);return;}
  const {width,height}=getScreen();
  if(!confirm(`Upload this ${width} × ${height} ${$('colourMode').value==='tri'?'three-colour':'black-and-white'} image?\n\nThe clock's current live display will be replaced by a static image until you switch it back.`)) return;
  setBusy(true);
  const started=performance.now();
  try {
    // Snapshot the preview exactly as seen.
    const preview=$('previewCanvas');
    const context=preview.getContext('2d',{willReadFrequently:true});
    const packed=packImage(context.getImageData(0,0,width,height),$('colourMode').value==='tri');
    const maxSize=Number($('packetSize').value);
    const every=Number($('ackInterval').value)+1;
    const planes=[{data:packed.mono,colour:'mono',label:'Black/white'}];
    if(packed.red)planes.push({data:packed.red,colour:'red',label:'Red'});
    const totalPackets=planes.reduce((s,p)=>s+Math.ceil(p.data.length/(maxSize-2)),0);
    let packetNumber=0;
    progress(0,'Preparing packets…');
    log(`Transferring ${width}×${height}, ${packed.totalBytes} bytes, ${totalPackets} packets, write size ${maxSize}`);
    for(const plane of planes){
      for(const packet of imagePackets(plane.data,plane.colour,maxSize)){
        // XLY95 sends batches of unacknowledged A1 writes, then a write with response.
        const acknowledged=((packetNumber+1)%every===0)||(packetNumber===totalPackets-1);
        await send(packet,acknowledged);
        packetNumber++;
        // Small gap makes short-MTU devices less susceptible to queue overflows.
        if(!acknowledged)await delay(4);
        if(packetNumber%16===0||packetNumber===totalPackets){
          progress(packetNumber/totalPackets*97,`${plane.label}: packet ${packetNumber}/${totalPackets}`);
          await delay(0); // yield to browser to update progress bar
        }
      }
    }
    progress(98,'Requesting e-paper refresh…');
    await send(commandPacket(COMMAND.REFRESH));
    progress(100,'Transfer complete — wait for the screen to refresh');
    log(`Image transfer and refresh command completed in ${((performance.now()-started)/1000).toFixed(1)} seconds`,'success');
    toast('Image sent. The e-paper display may take a little longer to refresh.');
  } catch(e){
    log(`Image upload failed after ${((performance.now()-started)/1000).toFixed(1)}s: ${e.message||e}`,'error');
    progress($('transferProgress').value,'Transfer failed — lower packet size and try again');
    toast(`Upload failed: ${e.message||e}`,true);
  } finally {setBusy(false);}
}

function detectSupport(){
  const banner=$('compatBanner');
  const isAppleMobile=/iPad|iPhone|iPod/.test(navigator.userAgent);
  if(isAppleMobile){
    banner.hidden=false;
    banner.textContent='On iPhone/iPad, standard Safari and Chrome do not provide Web Bluetooth. You can design and download images here, but connect from Chrome/Edge on a computer or Chrome on Android.';
  } else if(!navigator.bluetooth){
    banner.hidden=false;
    banner.textContent='This browser does not expose Web Bluetooth. Use Chrome or Edge on a desktop, or Chrome on Android, over HTTPS or localhost. Image design still works here.';
  } else if(!window.isSecureContext){
    banner.hidden=false;
    banner.textContent='Bluetooth requires a secure HTTPS or localhost address. Your image designer remains available.';
  }
}

function init(){
  const today=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date()).toUpperCase();
  $('todayTag').textContent=today;
  detectSupport();
  for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>setTab(btn.dataset.tab));
  for(const btn of document.querySelectorAll('[data-go]'))btn.addEventListener('click',()=>setTab(btn.dataset.go));
  for(const btn of document.querySelectorAll('[data-design]'))btn.addEventListener('click',()=>{
    $('template').value=btn.dataset.design;setTab('studio');renderPreview();
  });
  $('mainConnect').addEventListener('click', connectClock);
  $('topConnect').addEventListener('click',()=>connected()?disconnectClock():connectClock());
  $('disconnectBtn').addEventListener('click',disconnectClock);
  $('syncTime').addEventListener('click',syncClock);
  $('clockMode').addEventListener('click',()=>switchMode(1,'Clock mode'));
  $('calendarMode').addEventListener('click',()=>switchMode(2,'Calendar mode'));
  $('sendImage').addEventListener('click',uploadImage);
  $('downloadPng').addEventListener('click',downloadPng);
  $('clearLog').addEventListener('click',()=>{
    $('logEntries').replaceChildren();state.logCount=0;$('logCount').textContent='0 events';log('Log cleared');
  });
  $('imageInput').addEventListener('change',e=>loadImage(e.target.files?.[0]));
  ['template','screenSize','colourMode','headline','subtitle','timeFormat','imageFit','imageDither'].forEach(id=>{
    $(id).addEventListener('input',renderPreview);
  });
  $('resetDesign').addEventListener('click',()=>{
    $('template').value='clock';$('screenSize').value='4.2';$('colourMode').value='tri';
    $('headline').value='SYDNEY TIME';$('subtitle').value='A GOOD DAY TO GET THINGS DONE';
    $('timeFormat').value='24';$('imageFit').value='contain';$('imageDither').checked=true;
    state.loadedImage=null;$('imageInput').value='';renderPreview();toast('Design reset');
  });
  // Preview updates while this page is open; image sent to clock remains static.
  setInterval(()=>{if(!state.busy && $('template').value==='clock')renderPreview();},15000);
  setTab(['overview','studio','activity','guide'].includes(location.hash.slice(1))?location.hash.slice(1):'overview');
  renderPreview();updateUi();log('InkLink Studio ready. Awaiting BLE connection.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, {once: true});
} else {
  init();
}
