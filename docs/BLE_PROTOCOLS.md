# BLE protocol reference — InkLink Clock Studio

**Updated:** 14 October 2026. **Sources:** [XLY95 main index.html](https://github.com/XLY95/xly95.github.io/blob/main/index.html) and [XLY95 standalone js.js](https://github.com/XLY95/xly95.github.io/blob/main/js.js), inspected directly. The user's nRF Connect Mobile screenshot corroborates which services exist on the user's device. **Not a substitute for physical hardware tests.**

## Do not mix two protocols

The public XLY95 repository has two independently implemented Bluetooth interfaces, and the actual user's clock advertises as **NRF-6CD319** (hyphen). Its services match the site's **main index.html**, not the independent `js.js` protocol.

**NRF- (actual device; index.html implementation):**

| Field | UUID / command | Source-based confidence |
| --- | --- | --- |
| Device picker | `{filters:[{namePrefix:"NRF-"}], optionalServices:[0x221F,0x1F10,13187b10...]}` | Source-confirmed |
| EPD/display service | `13187b10-eba9-a3ba-044e-83d3217d9a38` | Source-confirmed; visible in user's nRF Connect service list |
| EPD characteristic | `4b646063-6264-f3a7-8941-e65356ea82fe` | Source-confirmed; not independently shown expanded in screenshot |
| Serial/RXTX service | `00001f10-0000-1000-8000-00805f9b34fb` | Source-confirmed; 0x1F10 visible in scan |
| Serial/RXTX characteristic | `00001f1f-0000-1000-8000-00805f9b34fb` | Source-confirmed; not independently shown expanded in screenshot |
| Other optional service | `0000221f-0000-1000-8000-00805f9b34fb` | Source-confirmed; 0x221F visible in scan |

Source flow: `requestDevice()` with NRF- filter and optional services; `gatt.connect()`; `getPrimaryService(13187b10...)`; `getCharacteristic(4b646063...)`; `startNotifications()`; separate `getPrimaryService(1F10)` and `getCharacteristic(1F1F)`. The original site handles EPD notifications and sends clock commands to the **RXTX characteristic**, not EPD.

**NRF_ (other/legacy js.js implementation):**

| Field | UUID / command |
| --- | --- |
| Device filter | `NRF_` (underscore) |
| Service | `32120001-0bf6-448a-9608-1b01a1a8f75c` |
| Characteristic | `32120002-0bf6-448a-9608-1b01a1a8f75c` |
| Info command | `A9` |
| Time command | `A3` followed by 4-byte big-endian Unix seconds |
| Clock/calendar | `AE 01` / `AE 02` |
| Image chunks | `A1` plus flags / packed data |
| Refresh | `A5` |

Those `NRF_` command bytes **must never be applied to NRF-**. The initial wrong-profile implementation produced `getPrimaryService(...32120001...): NotFoundError`, not evidence of faulty hardware. **The corrected EPD+RXTX connection has since been observed working on real hardware** (19:01 on 14 Oct); notification subscription and command effects remain unverified.

## NRF- clock commands from main index.html

### Time setting

The main page implements a function `setTime()` using `rxTxSendCommand(hexToBytes('dd' + ...))`, followed by `rxTxSendCommand(hexToBytes('e2'))`.

Write (to 1F1F, with response):

- `DD` (one byte)
- 4-byte **big-endian local-adjusted Unix seconds**, calculated upstream as `Math.round(Date.now()/1000) - new Date().getTimezoneOffset()*60` (offset hours set to zero in upstream code)
- 2-byte big-endian four-digit year
- 1-byte month (1–12)
- 1-byte day (1–31)
- 1-byte weekday (Monday=1 ... Sunday=7)
- Then `E2` to RXTX for refresh.

This command is **10 bytes** before the E2 refresh. InkLink's `encodeDashTime(date)` in `src/protocol.mjs` mirrors the observed layout. **The physical-device test on 14 Oct 2026 at 19:46:27–28 confirmed DD + E2 successfully synchronised the displayed time** (user report; log packet `DD 6A CF DC 13 07 EA 0A 0E 03`). Exact displayed date/weekday was not separately verified.

### Clock/calendar modes

Main page buttons explicitly use:

- Clock: `setri('e102')`, then 300 ms delay, then `e2` via RXTX.
- Calendar: `setri('e101')`, then 300 ms delay, then `e2` via RXTX.
- Image display mode from previously sent content: `e100` on RXTX. **Do not use until image storage/selection is understood**.
- Colour/font change `e4`, invert `e3`, rotate `e5`; these exist upstream but **are not yet implemented/validated in InkLink for this hardware**.

Do not confuse these with the NRF_ legacy `AE 01` / `AE 02` commands.

**Physical validation (14 Oct 2026):** Calendar `E1 01` + `E2` and Clock `E1 02` + `E2` were logged as completed by InkLink and explicitly confirmed to switch the real clock display. This is stronger evidence than source inspection or unit tests alone.

### EPD image data — NOT IMPLEMENTED for NRF- yet

From the main XLY95 page's `sendBufferData(value, type)`:

- Writes packets to the **EPD characteristic**, with response.
- For each hex-string chunk of `my_step=480` hex characters (up to **240 image-data bytes**), builds `cod + code + intToHex(i / 2, 2) + value.substring(i, i+step)`.
- `cod` is `03` by default; for some sizes (`value.length === 7000` or `18000` **hex characters**) it switches to `04`.
- `code` is `FF` by default and `00` for `type === 'bwr'`.
- `intToHex(i / 2, 2)` is the **2-byte position offset** and should be checked for wrap/limits on larger frames.
- Upstream's configured canvas sizes include 400×300, 296×128, 280×100, 800×480, 400×180, 212×128 and 250×128. **The actual pictured clock's geometry has not yet been measured or confirmed.**
- **The transformation of pixels to the EPD payload is not yet fully verified.** Investigate the entire image-preprocessing path and final display/refresh sequence; do not assume the legacy bit-plane conversion applies.

Before implementing NRF- image upload, derive byte-exact test vectors from the original site's image conversion, investigate the corresponding EPD-control and refresh commands, test packet sizes/write acknowledgements against known constraints, and obtain user's consent before the first physical upload. The InkLink UI explicitly disables this operation for NRF- devices.

## Offline NRF- image encoder — implemented but **NOT sent to hardware**

**14 Oct 2026, Phase 2 development checkpoint.** Source inspection of original XLY95 main \`index.html\` identified the byte-order and transfer format. InkLink now has an **offline-only** encoder in [\`src/dash-image.mjs\`](../src/dash-image.mjs) with 10 source-derived unit tests in [\`tests/dash-image.test.mjs\`](../tests/dash-image.test.mjs). The display designer offers an **Inspect encoded packets (offline)** button; it makes no BLE writes. The actual NRF- **Send to clock** route remains blocked by the explicit guard in \`src/app.mjs\`.

**Pixel encoding source:** \`canvas2bytes()\`, \`canvas2bytes_bw()\`, \`upload_image()\`.

- Pixels are encoded **MSB first**, 8 pixels/byte, no per-row padding on supported profiles (all dimensions yield an exact multiple of 8 pixels).
- **BW plane:** bit 1 only if **all three RGB components are nonzero** in XLY95's original code. In the new encoder, pixels must first be quantized to **opaque pure black (0,0,0), white (255,255,255) or red (255,0,0)**; then BW bit 1 means **white**.
- **Red plane:** bit 1 when RGB is (R>0,G=0,B=0) — **positive red mask**, not the **inverted red plane** from legacy \`NRF_\`. On a red pixel the BW bit is 0.
- **400×300, 800×480, 280×100, 400×180:** row-major left-to-right then top-to-bottom.
- **296×128, 212×128, 250×128:** XLY95 calls \`canvas2bytes_bw()\`, iterating **columns right-to-left**, and within each column **top-to-bottom**. Do not treat these as the same row-major layout.
- **212×128 and 250×128:** upstream uploads **only BW**, no red plane. Other supported sizes send BW then red.
- InkLink's e-paper canvas quantizer was changed to output exact black/white/red; its previous dark-blue/muted-red shades would have been misclassified by the original image encoder.
- If the image contains other RGB shades, transparency or red on a mono-only profile, the new encoder **throws instead of silently producing incorrect bytes**.

**Packet framing source:** \`sendBufferData(value, type)\`.

\`\`\`text
byte 0       : 0x03 normally, 0x04 for exactly 3500 or 9000 bytes/plane
byte 1       : 0xFF for BW; 0x00 for red
bytes 2–3    : big-endian zero-based byte offset in the plane
bytes 4–243  : up to 240 image-data bytes (final packet may be shorter)
\`\`\`

Source uses \`my_step=480\` hex **characters**, which equals **240 binary data bytes per packet**, with a **244-byte full characteristic write** including header. Partial 280×100 (3500 bytes per plane) and 400×180 (9000 bytes per plane) use opcode \`04\`; others use \`03\`. Upstream final EPD write is \`0xAA\` for the small/partial image modes (width 280 or height 180), or \`0x01\` for full images. The offline plan only **reports** that command; **it does not transmit or refresh**.

For a *hypothetical* 400×300 two-plane image: 15,000 bytes per plane, 30,000 image bytes, **126 characteristic writes** and **30,504 total transmitted bytes** including headers, with a maximum **244-byte** write. This is **not evidence that the user's actual screen is 400×300**, or that Android/clock negotiate an MTU sufficient for 244-byte writes. Original XLY95 displayed a **selected 400×300 canvas**, not independent physical panel measurement.

**Hardware validation gates still open:**
1. Determine the true controller/panel dimensions/orientation (e.g. use device documentation, full-device identification and matching XLY95 driver/profile; do not assume 400×300).
2. Verify the correct image-mode/refresh/restore sequence, characteristic write length/MTU and whether ~1-minute link lifetimes permit complete transfer.
3. Obtain byte-for-byte agreement on independent known-image fixtures in the original XLY95 site if feasible; existing test cases are algorithm-derived from inspected source, not captured BLE packets.
4. Perform a supervised, user-approved test with a simple reversible image only after complete validation. Keep old built-in Clock mode available as a fallback.
5. **Do not enable physical NRF- image upload or send the new offline packets automatically.**

## Software implementation map

- `src/dash-image.mjs`: **offline-only** image size profiles, strict pure-colour BW/red encoding, image packet framing, and plan calculation. No BLE APIs or writes.
- `tests/dash-image.test.mjs`: 10 image-format unit tests, run by CI along with 9 existing protocol tests.
- `src/protocol.mjs`: exported constants `SERVICE_UUID`, `CHARACTERISTIC_UUID`, `DASH_EPD_SERVICE_UUID`, `DASH_EPD_CHARACTERISTIC_UUID`, `DASH_RXTX_SERVICE_UUID`, `DASH_RXTX_CHARACTERISTIC_UUID`; `encodeTime()` and `encodeDashTime()`; `encodeDashMode()`; `DASH_REFRESH`; legacy `packImage()` and `imagePackets()`.
- `src/app.mjs`: picker `optionalServices` contains both profiles plus 221F; profile selected from `NRF-` vs `NRF_`; `discoverServiceCore()` obtains EPD and RXTX for dash profile; `send(packet,withResponse,channel)` can target `rxtx`/EPD; clock sync and modes use the appropriate profile; `uploadImage()` blocks dash profile.
- `index.html`: Safe connection defaults on, staged BLE diagnostics, explicit notification and legacy A9 test buttons.
- `tests/protocol.test.mjs`: source-level tests for 9 cases (encoding and bit-planes). **Not live radio tests**.

## Evidence/confidence conventions

- **Observed on real device:** nRF Connect listed 13187b10/1F10/221F; initial InkLink with wrong UUID could discover `NRF-6CD319` and sometimes connect GATT but could not access 32120001 service. **After correction, InkLink at ~19:01 on 14 October 2026 successfully discovered both EPD and RXTX characteristics and completed the 1.5-second idle connection test on the physical clock, using Safe mode.** EPD write/notify and RXTX write properties were exposed.
- **Confirmed from upstream source:** all UUIDs in table, time DD format, clock/calendar E1/E2 operations, differences between main page and standalone js.js, EPD image packet skeleton.
- **Automated-tested locally/on Actions:** encoder outputs and JavaScript syntax. This does not establish physical compatibility.
- - **Confirmed on real hardware (14 Oct 2026, Test K):** InkLink sent RXTX `DD 6A CF DC 13 07 EA 0A 0E 03` followed by `E2`, both writes completed and user confirmed the physical clock's displayed time synchronised. Notification subscription had also succeeded in Test H; actual incoming notification payloads not verified.
- **Confirmed on real hardware (14 Oct 2026, Test L):** RXTX Calendar mode `E1 01` then `E2` succeeded at ~19:53:20 and Clock mode `E1 02` then `E2` succeeded at ~19:53:39 in one session; user explicitly confirmed both on-screen switches. Together with Test K time sync, **all three core controls are verified physically**.
- **Pending verification:** notification payload decoding and **NRF- EPD image transfer** (`03/04` offset frames), correct display pixel geometry/planes, safe image-mode activation/refresh and return to built-in clock. The GATT disconnects after ~33.5s/57.2s/51.4s (InkLink) and ~59s after XLY95 service discovery remain of unknown cause.
- **Unknown:** BLE chip/firmware version, exact e-paper display controller and resolution, sleep and pairing behaviour, device security/bonding requirements, overall reliability.

## Common failure signatures

- `GATT connected` then `No Services matching UUID 32120001...`: **wrong service/profile for NRF-**, already addressed in source; do not add timing delays as first fix.
- `getPrimaryServices(): No Services found`: Web Bluetooth filters and permissions can hide non-authorized services; however user independently found the correct services with nRF Connect.
- `NetworkError: Connection attempt failed` at `gatt.connect()`: an intermittent link-level issue; investigate whether XLY95/nRF Connect is still using BLE, distance, device sleep/advertising, Android Bluetooth state. This is separate from UUID mismatch.
- Momentarily connected then disconnected: could result from old InkLink catch logic intentionally disconnecting on discovery exception. The app now logs stage and retains GATT after service discovery errors where possible.
- After next physical test: if correct EPD service exists but char lookup fails, record the exact `getCharacteristic` error and independently expand that service in nRF Connect. Do **not** invent replacement UUIDs.

## Research / documentation change policy

When code behavior changes, update this file and [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md), log the physical evidence in [TEST_HISTORY.md](TEST_HISTORY.md), and add/adjust automated tests. Always distinguish source-derived claims from measured device behaviour.
