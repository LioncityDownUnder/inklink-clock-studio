/**
 * NRF- image preparation for XLY95 main-index.html protocol.
 *
 * OFFLINE ONLY: no Bluetooth API, no device writes, no firmware operations.
 * Derived from upstream canvas2bytes(), canvas2bytes_bw(), upload_image(),
 * and sendBufferData(). The image uploader for NRF- remains disabled.
 *
 * Important differences from legacy NRF_:
 *   - Separate BW and red-positive planes (red=1 means RED)
 *   - 296x128 uses right-to-left columns, top-to-bottom within each
 *   - Chunk header: 03/04 + FF/00 + 16-bit big-endian byte offset
 *   - Each chunk holds up to 240 image bytes (244 total)
 */
export const DASH_IMAGE_PROFILES = Object.freeze([
  Object.freeze({width:400,height:300,order:'rows',red:true,refresh:0x01,name:'400 × 300 full'}),
  Object.freeze({width:296,height:128,order:'reverse-columns',red:true,refresh:0x01,name:'296 × 128 full'}),
  Object.freeze({width:280,height:100,order:'rows',red:true,refresh:0xAA,name:'280 × 100 partial'}),
  Object.freeze({width:800,height:480,order:'rows',red:true,refresh:0x01,name:'800 × 480 full'}),
  Object.freeze({width:400,height:180,order:'rows',red:true,refresh:0xAA,name:'400 × 180 partial'}),
  Object.freeze({width:212,height:128,order:'reverse-columns',red:false,refresh:0x01,name:'212 × 128 mono'}),
  Object.freeze({width:250,height:128,order:'reverse-columns',red:false,refresh:0x01,name:'250 × 128 mono'})
]);
export const DASH_DATA_BYTES_PER_PACKET = 240;

export function getDashImageProfile(width,height) {
  return DASH_IMAGE_PROFILES.find(p => p.width === width && p.height === height) || null;
}

export function packDashImage(image) {
  const {width,height,data} = image || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      !data || !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) ||
      data.length !== width * height * 4) {
    throw new TypeError('Expected RGBA image with matching width, height and pixel buffer');
  }
  const profile=getDashImageProfile(width,height);
  if (!profile) throw new RangeError('No verified upstream NRF- size profile for ' + width + ' × ' + height);
  const totalPixels=width*height;
  if (totalPixels % 8 !== 0) throw new RangeError('NRF- upstream packing requires a multiple of eight pixels');
  const bw=new Uint8Array(totalPixels/8);
  const red=profile.red ? new Uint8Array(totalPixels/8) : null;

  // Upstream bit test: BW=1 only if every RGB component >0; BWR=1 only
  // if R>0, G===0, B===0. For predictable results, require pure palette.
  // The app's canvas quantizer produces these exact RGB values.
  let n=0;
  const append=(pixel) => {
    const o=pixel*4;
    const r=data[o],g=data[o+1],b=data[o+2],a=data[o+3];
    const isWhite=r===255 && g===255 && b===255 && a===255;
    const isBlack=r===0 && g===0 && b===0 && a===255;
    const isRed=r===255 && g===0 && b===0 && a===255;
    if (!(isWhite||isBlack||isRed)) {
      throw new RangeError('Pixel ' + pixel + ' is not opaque pure black, white or red; quantize canvas first');
    }
    if (isRed && !profile.red) throw new RangeError('Red pixel not supported by ' + profile.name);
    const mask=0x80 >>> (n % 8);
    if (isWhite) bw[n >>> 3] |= mask;
    if (red && isRed) red[n >>> 3] |= mask;
    n++;
  };
  if (profile.order === 'reverse-columns') {
    for(let x=width-1;x>=0;x--) for(let y=0;y<height;y++) append(y*width+x);
  } else {
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) append(y*width+x);
  }
  return {profile,bw,red};
}

/** Replicates XLY95 sendBufferData() packet order/header; NO BLE writes. */
export function* dashImagePackets(plane, kind='bw') {
  if (!(plane instanceof Uint8Array) || plane.length === 0 || plane.length>65535) {
    throw new RangeError('Plane must contain between 1 and 65535 bytes');
  }
  if (kind !== 'bw' && kind !== 'red') throw new RangeError('Plane must be bw or red');
  const opcode=(plane.length === 3500 || plane.length === 9000) ? 0x04 : 0x03;
  const flag=kind==='red'?0x00:0xFF;
  for (let offset=0;offset<plane.length;offset+=DASH_DATA_BYTES_PER_PACKET) {
    const size=Math.min(DASH_DATA_BYTES_PER_PACKET,plane.length-offset);
    const packet=new Uint8Array(size+4);
    packet.set([opcode,flag,(offset>>>8)&0xff,offset&0xff]);
    packet.set(plane.subarray(offset,offset+size),4);
    yield packet;
  }
}

export function createDashTransferPlan(image) {
  const packed=packDashImage(image);
  const packets=[];
  for(const p of dashImagePackets(packed.bw,'bw'))packets.push(p);
  if (packed.red) for(const p of dashImagePackets(packed.red,'red'))packets.push(p);
  const imageBytes=packed.bw.length+(packed.red?.length||0);
  const transmissionBytes=packets.reduce((n,p)=>n+p.length,0);
  return {
    profile:packed.profile, bwBytes:packed.bw.length, redBytes:packed.red?.length||0,
    imageBytes, transmissionBytes, packetCount:packets.length,
    maxPacketBytes:Math.max(...packets.map(p=>p.length)),
    refreshCommand:Uint8Array.of(packed.profile.refresh),
    packets // OFFLINE INSPECTION ONLY; do not send until hardware protocol approved
  };
}
