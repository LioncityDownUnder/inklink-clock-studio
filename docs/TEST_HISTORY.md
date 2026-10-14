# Testing and investigation history

**Evidence log started:** 14 October 2026 (Sydney local time). This documents earlier failures and the successful first physical test with the corrected NRF- two-service profile. Use it to avoid repeating failed hypotheses. Each entry is a summary of user-reported screenshots/logs; screenshots themselves are not committed to a public repository.

## Date: 14 October 2026 — initial device and app

**Photo of clock:** white Chinese e-paper desk clock, large black digital clock, red accents, date, temperature, 3.9V battery indication, Chinese lunar date and solar-term countdown. Exact panel size/controller, MCU, firmware unknown. The user wanted English customisation and a dedicated browser-based BLE tool.

**Original configuration page:** https://xly95.github.io/ . User confirmed it can discover and program the clock using BLE. The site is open-source: https://github.com/XLY95/xly95.github.io .

**InkLink v1:** created `LioncityDownUnder/inklink-clock-studio` public GitHub repo, a modular HTTPS GitHub Pages app and an Actions test/deploy workflow. Initial implementation extracted BLE constants from XLY95's *standalone js.js*. It assumed the device used a single `32120001` service, `32120002` characteristic and `A3/AE/A1/A5` commands. Those constants are **wrong for the actual NRF- clock**.

## Test record A — device picker initially empty

**Symptom:** XLY95 could list the clock, but InkLink's name-filtered chooser initially did not show it. Broader chooser, browser diagnostics and Safe connection option were added.

**Finding:** Real name reported as `NRF-6CD319` (hyphen). Some intermediate code searched only for `NRF_` and then broadened to `NRF`; neither prefix alone establishes device identity. User later confirmed XLY95 itself shows names like `NRF-XXXXXX`.

**Outcome:** Both name formats supported; current app requests correct optional services for each profile. Do not repeat the claim that the `NRF-` device is unrelated just because the standalone `js.js` filter is `NRF_`.

## Test record B — connected briefly, then disconnected

**Source:** user screenshot ~17:05, after selecting an NRF- device in Safe mode.

**Representative Activity Log:**
- `BLE stage: device selected: NRF-XXXXXX`
- `BLE stage: GATT connected`
- `Connection failed at stage "GATT connected": Error: 2`
- `Bluetooth disconnected by request (4.0s after selection)`

**Interpretation:** In the then-current implementation, `getPrimaryService(32120001...)` failed and InkLink's catch block disconnected GATT. The last line was **app-initiated**, not proof that the clock spontaneously disconnected.

**Changes tried:** better per-stage logs and Safe connection mode that avoids sending A9 and avoids automatically enabling notifications. Safe mode still performs BLE GATT/service discovery, so an incorrect service UUID can still fail.

## Test record C — service mismatch confirmed repeatedly

**Sources:** screenshots ~17:12 and ~17:27 using Android Chrome on the `NRF-6CD319` device.

**Representative errors:**

`getPrimaryService failed: NotFoundError: No Services matching UUID 32120001-0bf6-448a-9608-1b01a1a8f75c found in Device.`

`getPrimaryServices diagnostic failed: NotFoundError: No Services found in device.`

**Interpretation at the time:** the app asked for the standalone/legacy profile's UUID. Web Bluetooth's service permissions can additionally limit `getPrimaryServices()` visibility. This log is **not** proof there are zero GATT services.

**Changes that did not resolve mismatch:** wait 300 ms after picker; wait 350 ms after GATT connection; adding "Retry service discovery"; scanning all devices; an NRF-only name filter. These changed timings/UI, not the wrong service UUID.

## Test record D — separate intermittent GATT connection failure

**Source:** screenshot ~17:17 on Android Chrome, clock `NRF-6CD319`.

**Log:** `NetworkError: Connection Error: Connection attempt failed.` at `gatt.connect()` before the `GATT connected` stage.

**Interpretation:** A distinct connection-level problem that may be intermittent and may involve other active BLE sessions, sleep/advertising or Android stack state. Do not infer that UUID correction alone guarantees every attempt succeeds.

**Next diagnostic if it recurs:** ensure nRF Connect and XLY95 are disconnected/closed; test the same clock with XLY95 on the same Android phone/browser, note any pairing/bonding state and capture the exact first failure.

## Test record E — nRF Connect exposed actual GATT services

**Source:** user screenshot ~18:50 from nRF Connect for Android. The interface displayed `NRF-6CD319`, with a **DISCONNECTED / NOT BONDED** status at screenshot time, and the following populated service list (perhaps persisted from an earlier service discovery):

| Service UUID | Name shown |
| --- | --- |
| 0x1800 | Generic Access |
| 0x1801 | Generic Attribute |
| 0x180F | Battery Service |
| 0x180A | Device Information |
| 0xFEF5 | Unknown Service |
| 13187b10-eba9-a3ba-044e-83d3217d9a38 | Unknown Service |
| 0x1F10 | Unknown Service |
| 0x221F | Unknown Service |

**Critical:** the 13187b10 service and 1F10 are in XLY95's main `index.html` BLE code. The 32120001 service used in the app before this discovery is not listed. No characteristics were expanded in that screenshot; EPD/RXTX characteristic UUIDs are confirmed by source code instead.

## Investigation record F — main-page implementation discovered

**Sources:** the public XLY95 repository's `index.html` and separate `js.js`, examined on 14 October 2026.

- `index.html` picker filters **NRF-**, and requests 0x221F, 0x1F10 and 13187b10 optional services.
- It discovers EPD characteristic `4b646063-6264-f3a7-8941-e65356ea82fe`, enables notifications, and separately discovers RXTX characteristic `0x1F1F` in service `0x1F10`.
- It writes time via `DD` local-time payload plus `E2` and clock/calendar via `E1 02`/`E1 01` plus `E2`, **to the RXTX characteristic**.
- `js.js` instead filters **NRF_**, asks for service 32120001 and uses different opcodes.
- It uses a distinct `03/04` offset-based image packet format on the EPD characteristic. Image encoding/transfer has NOT yet been implemented in InkLink for NRF-.

This was the actual root cause of the persistent service-not-found errors. See [BLE_PROTOCOLS.md](BLE_PROTOCOLS.md).

## Code checkpoint — dual-protocol NRF- update

**Commits on 14 October 2026** (initial correction series; subsequent source commits supersede):
- `31ed1a8e...`: added actual NRF- UUIDs and local DD/E1/E2 encoding utilities to `src/protocol.mjs`.
- `7a0c80e1...`: added NRF- service/characteristic discovery and dual-channel clock controls in `src/app.mjs`; disabled incompatible legacy image uploads on NRF-.
- `8275a641...`: expanded automated protocol tests to 9 cases.
- `64d5ad15...`: added profile status in UI.
- `92ce7220...`: updated project README with both protocols.
- Last checked Actions run for the source update: https://github.com/LioncityDownUnder/inklink-clock-studio/actions/runs/38531754437 — **success**, with syntax checks, 9 protocol unit tests and GitHub Pages deployment.

**HARDWARE STATUS UPDATE:** The corrected dual-profile build was subsequently verified on the physical clock in **Test record G** at 19:01. Both services/characteristics and the initial 1.5-second idle check passed. Command writes and notifications are still unverified.

## Test record G — CORRECTED NRF- dual-service connection confirmed on physical hardware (SUCCESS)

**Date:** 14 October 2026, approximately 19:01 Australia/Sydney.

**Evidence:** User-provided Android screenshot of the InkLink Activity Log (19 connection events, final visible log rows at 19:01:06–19:01:07). The screenshot is not uploaded to this public repository. This observation follows the dual-profile implementation and successful GitHub Pages deployment; it is **the first confirmed physical connection with the corrected NRF- profile**.

**Observed SUCCESS entries (transcribed from screenshot):**

- `BLE stage: NRF- RXTX characteristic discovered`
- `Protocol profile: NRF- EPD + RXTX (XLY95 main page)`
- `EPD capabilities: write, notify`
- `RXTX write capability: true`
- `Safe mode: notifications disabled; no A9 or other command sent.`
- `BLE stage: idle connection test (1.5 seconds)`
- `BLE stage: connected and stable`

**Conclusions confirmed on user's real hardware:**

- InkLink's corrected `NRF-` profile discovers its two required GATT services and characteristics successfully. The RXTX characteristic was found; the app reports EPD `write`/`notify` and RXTX `write` as available.
- The initial **1.5-second** idle stability check passed (after service discovery). **No ten-second or longer stability observation has yet been provided.**
- In Safe mode, the app did not start notifications or write a clock command. Therefore notifications, DD/E2 time sync, E1/E2 clock/calendar mode and on-screen effects remain **UNTESTED**.
- This resolves the **wrong UUID / missing service** blocker for the corrected build in this test, not all BLE reliability or screen control milestones.

**Next requested check:** With the same Android Chrome session and correct clock, leave it connected for 10–15 seconds to confirm longer stability. Then press `1. Enable notifications`; wait and capture the log. If that succeeds, press `Sync date & time` once and visually confirm the physical clock changes to the right local date/time. Test built-in Clock/Calendar modes separately afterward. Do not upload an image to `NRF-` yet.

## Test record H — notifications enabled, followed by unrequested disconnect after 33.5 seconds

**Date/time:** 14 October 2026, approximately 19:21–19:22 Australia/Sydney. **Environment:** user's Android Chrome, corrected NRF- dual-profile InkLink, using on-device Activity Log (45 events). This new evidence supersedes the earlier "notification subscription untested" status, but does **not** prove reliable sustained BLE communication.

**Exact visible log progression, transcribed from screenshot:**

- `19:21:39 SUCCESS BLE stage: connected and stable`
- `19:21:56 INFO BLE stage: starting notifications`
- `19:21:57 SUCCESS BLE stage: notifications enabled`
- `19:21:57 SUCCESS Enable notifications: command completed`
- `19:22:07 ERROR Unexpected GATT disconnect after 33.5s. Last completed stage: notifications enabled. Web Bluetooth does not expose a device disconnect reason.`

**Verified findings:**

- The corrected physical NRF- EPD+RXTX connection works; the device remained available long enough to initiate notification setup.
- `startNotifications()` **succeeded** on the actual EPD characteristic. This is a successful *subscription*, not proof that any notification payload arrived; none is visible in this screenshot.
- GATT subsequently disconnected unexpectedly, at **33.5 seconds measured from device selection**, roughly **10 seconds after notifications succeeded**. The app did not log an intentional disconnect.
- Cause **unknown**. A roughly 30-second idle policy, clock sleep, BLE/link interruption or Android stack issue are hypotheses only. Temporal association alone does **not** establish that `startNotifications()` triggered the disconnect.
- Connection continued more than 10 seconds after the earlier successful `connected and stable` log (19:21:39 to 19:22:07), but **uninterrupted long-term reliability is not proven**. A single 33.5-second session subsequently ended unexpectedly.
- **No time sync or clock/calendar mode change** has yet been observed on hardware.

**Source follow-up:** Inspected XLY95's main `index.html` again. It does not implement an obvious periodic BLE keepalive. Its `setInterval(..., 1000)` updates text on the web page, not the BLE clock. This does not prove there is no firmware idle timeout, and is **not a reason to start sending speculative commands**. Original source also contains manual retry handling, not evidence of automatic sustained reconnection after disconnect.

**Next controlled comparison — do not skip:**

1. Disconnect XLY95 and nRF Connect, keep Android Chrome foreground and phone awake.
2. Connect InkLink in **Safe mode**, then **do not press Enable notifications or any other controls**. Keep the page open for **60 seconds**, and note if/when it disconnects. Capture the final Activity Log including `Unexpected GATT disconnect after ...`, or confirm it remains connected at 60 seconds.
3. Compare the connection duration to the 33.5-second notification-enabled session. If it drops at roughly the same interval *without* notifications, a timeout independent of notification setup becomes more likely. If it remains connected substantially longer (e.g. 60+ seconds), focus on notification effects, firmware expectations or other differences; repeat before concluding causality.
4. If needed, run an equivalent idle test on XLY95 in the **same Android Chrome** (disconnect InkLink first), observing whether the site stays connected. Do not alter firmware.
5. Only after clarifying stability, test DD/E2 time sync, checking physical clock display. `NRF-` image upload remains disabled.

## Test record I — Safe-mode idle GATT disconnect at 57.2 seconds, WITHOUT notifications

**Date/time:** 14 October 2026, approximately 19:30–19:31 Australia/Sydney. **Environment:** Android Chrome, NRF- clock, corrected dual-profile InkLink, user screenshot of 20 events. No screenshot or MAC address is stored in this public repository.

**Exact relevant visible log sequence:**
- `19:30:12 INFO RXTX write capability: true`
- `19:30:12 SUCCESS Safe mode: notifications disabled; no A9 or other command sent.`
- `19:30:12 INFO BLE stage: idle connection test (1.5 seconds)`
- `19:30:14 SUCCESS BLE stage: connected and stable`
- `19:31:07 ERROR Unexpected GATT disconnect after 57.2s. Last completed stage: connected and stable. Web Bluetooth does not expose a device disconnect reason.`

**Comparison against Test H (notifications):**

| Experiment | Subscription / outbound commands | Measured GATT lifetime from device selection | Outcome |
| --- | --- | --- | --- |
| Test H at 19:21–19:22 | EPD `startNotifications()` succeeded; no control command evidenced | **33.5 seconds** | Unexpected disconnect |
| Test I at 19:30–19:31 | **Safe mode: no notifications and no commands** | **57.2 seconds** | Unexpected disconnect |

**Confirmed conclusions:**
1. An unexpected disconnect **also occurs without `startNotifications()`**. Therefore notifications are **not a necessary condition** for the drop. Their potential influence on connection duration cannot be inferred from two trials.
2. Safe-mode GATT survived about **57.2 seconds from selection**, much longer than the earlier initial 1.5-second stability check. This is evidence of a working connection but **not sustained reliability**.
3. Disconnection was logged as unrequested; the browser does not reveal the radio/firmware disconnect reason. No notification payload, DD/E2 time sync, or mode setting has yet been verified.
4. A fixed 30s or 60s timeout, firmware sleep policy, Android Chrome bug, radio-link instability, and Bluetooth conflict remain **hypotheses**, not confirmed causes.

**Next highest-value experiment:** Use **original XLY95 main website in the same Android Chrome/browser**, disconnect InkLink first, connect the exact same `NRF-` clock, **do not press time/mode/image controls**, keep tab foreground and phone awake for **90–120 seconds**, and report whether XLY95 remains connected or disconnects. This changes the website implementation while holding device/phone conditions similar. XLY95 subscribes to notifications during connect, so it is not a perfectly identical condition; record the distinction.

**Interpretation:**
- **XLY95 also disconnects at around 30–60s:** supports a clock/Android/link-level idle disconnect hypothesis rather than an InkLink-specific software fault, but repeat trials before attributing cause.
- **XLY95 reliably stays connected 90–120+s:** compare its connection lifecycle/notification handling, BLE write/keepalive behavior, and error/reconnect handling with InkLink. Do not add speculative keepalive writes without protocol evidence.
- **Original site reconnects silently:** distinguish a true uninterrupted connection from a UI that automatically reconnects. Check status/log if available.

## Test record J — original XLY95 ALSO disconnects after approximately one minute (cross-site confirmation)

**Date:** 14 October 2026, approximately 19:37–19:38 Sydney. **Hardware and client:** same `NRF-` clock, same Android Chrome phone, original https://xly95.github.io/ main-page BLE controller. Screenshot provided by user; not copied to this public GitHub repository.

**Evidence from XLY95's own on-page log (translated from Chinese):**

- `19:36:53 画布尺寸已更新为：400x300` — canvas selection was set to 400×300. **This is an on-page setting, NOT independent physical screen identification.**
- `19:37:03 正在链接: NRF-6CD319` — beginning connection.
- `19:37:07 > 找到GATT服务器` — GATT server found.
- `19:37:08 > epdService 找到可用服务` — EPD service discovered.
- `19:37:08 > epdCharacteristic 服务已连接` — EPD characteristic connected.
- `19:37:08 > rxtxService 找到串口服务` — RXTX service discovered.
- `19:37:08 > rxtxCharacteristic 串口服务已连接` — RXTX characteristic connected.
- `19:38:07 链接已断开.` — connection disconnected.

**Measured outcome:** connection remained up for about **59 seconds after service/characteristic discovery** (19:37:08 to 19:38:07), or ~64 seconds from beginning the connection attempt (19:37:03). Original XLY95 also disconnected with no user-initiated time, display-mode or image command during the idle observation, per user report.

**Comparison with InkLink:**

| Site/test | Notifications | BLE session ending | Result |
|---|---|---|---|
| InkLink H | Enabled successfully | 33.5s after device selection | Unrequested disconnection |
| InkLink I | Safe mode; no notifications or commands | 57.2s after device selection | Unrequested disconnection |
| **XLY95 J** | XLY95 normally enables EPD notifications during connection | **~59s after service discovery** | Disconnected, per original site's own log |

**Interpretation (bounded):** These results make the disconnection **unlikely to be a bug unique to InkLink**, since the original vendor/community web UI experiences it on the same clock and browser. A normal peripheral idle timeout or power-saving behaviour is plausible; Android/BLE stack behaviour and radio instability are also plausible. **Do not claim an exact 60-second built-in timer or confirmed cause.** XLY95 did not visibly reconnect during the screenshot; that does not establish it never reconnects automatically.

**Engineering decision:** Do not introduce speculative keepalive messages or rework InkLink's working BLE service selection merely to suppress an unproven timeout. For the current goal—configuring the clock—an approximately one-minute window may be sufficient. Move to testing **one user-initiated, already source-verified clock time command** promptly after connecting (and then the clock/calendar commands), with visual confirmation on the physical display. Separately research idle lifetime/reconnection only if ongoing sessions are required for future live dashboards.

## Test record K — SUCCESS: InkLink time sync physically updates the clock

**Date/time:** 14 October 2026, 19:46–19:47 Australia/Sydney; user's Android Chrome on the same `NRF-` clock, with Safe connection. Evidence: user Activity Log screenshot (24 events), plus **explicit user confirmation: "time is synced"**. Do not store their screenshot in this public repository.

**Observed log lines (exact data):**
- `19:46:17 INFO BLE stage: idle connection test (1.5 seconds)`
- `19:46:19 SUCCESS BLE stage: connected and stable`
- `19:46:27 INFO RXTX TX DD 6A CF DC 13 07 EA 0A 0E 03 (XLY95 NRF- local-time format)`
- `19:46:28 INFO RXTX TX E2 — refresh`
- `19:46:28 SUCCESS Time sync: command completed`
- `19:47:07 ERROR Unexpected GATT disconnect after 51.4s. Last completed stage: connected and stable. Web Bluetooth does not expose a device disconnect reason.`

**Confirmed on actual hardware:** the `NRF-` RXTX `DD` 10-byte local-time write followed by `E2` refresh was accepted by the browser's BLE writes, and **the user confirmed the clock's displayed time was successfully synchronised**. This is the first end-to-end physical clock-control success, exceeding earlier service-discovery-only milestones. Date payload bytes `07 EA 0A 0E 03` encode year 2026, October 14, weekday 3 (Wednesday). The user did not explicitly report detailed weekday/date display verification; don't infer more than time sync.

**Separate idle-link finding:** The later unexpected disconnection at 51.4s after selection is consistent with earlier InkLink 33.5s / 57.2s and original XLY95 ~59s-after-discovery disconnections. This is **not** proof that the time command caused a disconnect or of a fixed timeout. Device idle/reconnection behaviour remains to be analysed separately if needed for ongoing dashboards.

**Next step:** Physical mode-switching tests. Reconnect in Safe mode. Press **Calendar mode** once promptly after `connected and stable` and inspect both Activity Log and actual display. The source-confirmed NRF- command is `E1 01` followed by 300ms then `E2`. If successful, reconnect if necessary, press **Clock mode** once (`E1 02` then 300ms then `E2`) and confirm the built-in clock display returns. Capture errors and user confirmation. **NRF- image upload is still disabled.**

## Test record L — SUCCESS: physical Calendar/Clock modes switch both directions

**Date/time:** 14 October 2026, approximately 19:53 Australia/Sydney. **Environment:** Android Chrome on original `NRF-` clock, corrected InkLink Safe connection. Source of evidence: user's screenshot of Activity Log with 48 events, plus explicit user statement: **"yes clock and calendar switch passed"**. No private screenshot is committed to this public repository.

**Exact visible Activity Log sequence:**
- `19:53:05 SUCCESS Safe mode: notifications disabled; no A9 or other command sent.`
- `19:53:05 INFO BLE stage: idle connection test (1.5 seconds)`
- `19:53:07 SUCCESS BLE stage: connected and stable`
- `19:53:18 INFO RXTX TX E1 01`
- `19:53:20 INFO RXTX TX E2 — refresh`
- `19:53:20 SUCCESS Calendar mode: command completed`
- `19:53:38 INFO RXTX TX E1 02`
- `19:53:39 INFO RXTX TX E2 — refresh`
- `19:53:39 SUCCESS Clock mode: command completed`

**Physically confirmed:** the user reports both calendar display and clock display switched as intended. The screenshot confirms all four source-documented RXTX writes (Calendar `E1 01` + `E2`; Clock `E1 02` + `E2`) completed in a **single BLE connection**. No disconnection or error is visible in this screenshot; it does not establish indefinite connection stability.

**Major milestone:** all three core user-controlled functions have now been verified end-to-end on the clock:
1. Time sync (`DD` payload + `E2`), confirmed by user in Test K.
2. Switch to Calendar (`E1 01` + `E2`), confirmed here.
3. Switch back to Clock (`E1 02` + `E2`), confirmed here.

**Not yet implemented/tested:** the actual `NRF-` **image-transfer protocol**, accurate physical panel resolution/pixel packing, ability to display a custom English image, and continuous live custom layouts. The current app intentionally disables NRF- image uploads. Older legacy `NRF_` A1 packets are incompatible with this NRF- clock.

**Next engineering checkpoint:** inspect the *entire* original XLY95 main `index.html` image-conversion and `sendBufferData()` implementation; derive byte-exact offline tests for packet framing, color/bitplane mapping, dimensions, and refresh sequence. Build safe source/test coverage **without sending new image data to the physical clock until the protocol, dimensions and restore path are verified**. See [BLE_PROTOCOLS.md](BLE_PROTOCOLS.md) and [ROADMAP.md](ROADMAP.md).

## Engineering checkpoint M — source-derived offline NRF- image packet encoder (NO device transfer)

**Date:** 14 October 2026. **Scope:** GitHub code and automated tests only; not a physical image upload.

**Upstream inspected:** XLY95 main `index.html`: `canvas2bytes`, `canvas2bytes_bw`, `upload_image`, `sendBufferData`, plus EPD write/refresh helpers. This is the `NRF-` protocol, **not** legacy `NRF_` A1 uploads.

**Code created:** `src/dash-image.mjs` exports an explicit table of seven original XLY95 image geometries and safe, pure RGB quantisation requirements, the BW/positive-red bitplane builder (row-major or reverse-column order by display profile), a `03/04 + colour + 16-bit BE byte offset + up to 240 image bytes` packet iterator, and a read-only transfer-plan calculator. `src/app.mjs` now renders pure black/white/red pixels so original XLY95's zero-component tests encode them correctly. A new `Inspect encoded packets (offline)` button in the Display Designer computes the count, sizes, first/last headers and refresh command **without touching BLE**.

**Automated verification:** `tests/dash-image.test.mjs` adds 10 tests for palette/packing, reverse-column orientation, strict validation, both plane header flags, 03/04 selection, 240-byte chunks, profile-dependent refresh and full 400×300/800×480 plan sizes. The existing 9 tests remain. GitHub Actions now checks syntax of `src/dash-image.mjs` and runs **all 19 tests** before deployment. The tests are source-derived algorithm checks, not captured-packet hardware fixtures.

**Example plan for 400×300 PRESET (not physically verified screen size):** two 15,000-byte planes, 126 packets, 30,504 characteristic bytes including headers, max packet 244 bytes, full-screen EPD refresh `01`. This may not fit the real BLE MTU and could exceed the observed ~1-minute connection window; no physical transfer attempt has occurred.

**Safety checkpoint:** Keep the current NRF- upload button disabled. Original XLY95 selected canvas 400×300 on the user's screenshot, but no independent hardware panel resolution/driver confirmation. We still need verify reliable write length/MTU, image control state, exact refresh/restore conditions and an agreed supervised upload plan.

**Next:** Confirm the offline packet inspector actually renders its summary in Android Chrome and obtain more reliable panel/model identification. Then use independent upstream-derived fixtures and protocol research to work toward supervised upload—not yet an automatic BLE write.

## Test record N — SUCCESS: offline NRF- image packet inspector ran in Android Chrome

**Date:** 14 October 2026, approximately 20:34 Sydney local time. **Evidence:** User screenshot of live InkLink Display Designer in Android Chrome, with the English clock face preview and the new **Inspect encoded packets (offline)** result displayed. Original screenshot stays in the chat, not this public GitHub repository.

**Observed inspector output for selected 400×300 source preset:**

| Field | Browser result |
|---|---|
| Profile | 400 × 300 full |
| Transfer packets | **126** |
| BW plane | **15,000 bytes** |
| Red plane | **15,000 bytes** |
| Total characteristic bytes including framing headers | **30,504** |
| Largest characteristic write / image packet | **244 bytes** |
| First packet header | **03 FF 00 00** (BW, offset 0) |
| Last packet header | **03 00 3A 20** (red, offset 14880, derived from 62×240) |
| Expected EPD refresh | **01** |
| BLE performed by inspector | **None**; app explicitly reported no Bluetooth transmission |

**What this confirms:** the offline image-packet code runs in the user's actual Android Chrome and produces its expected source-derived dimensions, plane lengths, chunk count, headers and report without touching the clock. The snapshot shows the English image preview rendering. This is an **offline browser/runtime check**, not independent validation of the physical clock's image encoding, panel geometry or a successful GATT image write.

**Critical outstanding size issue:** original XLY95 sends up to **244 bytes per EPD characteristic write** (240 image bytes + 4 header bytes). According to Bluetooth ATT, an ordinary acknowledged characteristic Write Request can carry at most **ATT_MTU − 3** value bytes, so a 244-byte write requires an effective **ATT MTU ≥ 247**. The actual negotiated MTU between the clock and Android Chrome has **not** been measured. nRF Connect for Android can request an MTU and report the connection's result, but its negotiation is a **different session** and does not prove Chrome negotiated the same value. Do not send a dummy write or image frame merely to probe capacity.

**Other outstanding issue:** the observed XLY95 400×300 setting is a canvas preset, **not** proof of the clock's real display resolution/controller; a device label or documentation would improve identification. No physical NRF- image data has been transmitted by InkLink; the upload action remains disabled.

**Next safe user check:** In nRF Connect for Android (with InkLink/XLY95 disconnected), connect to the same clock, open the device ⋮ menu, choose **Request MTU**, request **247** if permitted, and inspect the connection log for the **negotiated/updated MTU**. Do not write characteristics or flash firmware. Record the returned MTU and any error. Follow up separately with a photo/model of the clock's back or packaging (hide serial/MAC) to confirm physical panel size. Do not enable image upload yet.

## Hardware identification record O — front photo of unlabelled 3D-printed enclosure

**Date:** 14 October 2026. User supplied a full straight-on physical-device photograph and explained that the surrounding white frame is **3D printed and has no model label**. The photograph remains in the private conversation and is NOT committed to this public repository.

**Directly visible:** landscape recessed e-paper display, approximately 4:3 aspect ratio, with visually distinct black large digital time numerals, red date lettering, monochrome Chinese weekday/lunar/solar-term labels, moon symbol, battery voltage icon and temperature. The pixel grid cannot be counted reliably from this photograph; the PCB and panel rear are not visible.

**Evidence strength:** the aspect ratio and black/white/red output are **consistent with** a 4.2-inch 400×300 tri-colour e-paper panel, and original XLY95 selected a 400×300 canvas preset. However this does **not prove** the exact panel resolution, manufacturer, display driver or orientation. Generic 4.2-inch 400×300 B/W/R panel datasheets report an **active area of 84.8 × 63.6 mm** (e.g. https://www.mouser.com/datasheet/2/744/4_2inch_e_paper_b_specification-1488179.pdf ). This is a **comparison reference, not an identification of the installed hardware**.

**Next safe hardware check (no disassembly/firmware):** ask user to measure the **visible active display area** (not outer 3D-printed frame) in millimetres. Around 85 × 64 mm would support the 4.2-inch 400×300 hypothesis. A non-matching physical area would motivate a search for an alternative display size. Cross-check later against original XLY95 device-specific settings and nRF Connect Device Information (0x180A) if populated. Do not infer resolution from measurements alone.

**Image transfer remains DISABLED** until panel geometry and Bluetooth write capacity/MTU are verified; never treat the screenshot alone as authorization for test writes.

## Hardware BLE MTU and link timeout record P — Android nRF Connect

**Date:** 14 October 2026 ~20:51–20:52, user screenshot from Nordic nRF Connect for Android on the actual NRF- clock. Screenshot remains in private conversation; do not commit device MAC address.

**Observed facts:** Android app reported `Requested MTU not supported. MTU changed to: 512` twice (20:51:40.730 and 20:52:40.130). The connection log also reported a disconnect at 20:52:07.289 with `Error 8 (0x8): GATT CONN TIMEOUT`. Prior connection-parameter updates displayed 27.5ms interval, latency 10, and 3000ms supervision timeout; that supervision timeout is **not** the same as a 60-second application idle timer. nRF Connect subsequently reconnected and rediscovered services.

**Inference and limitation:** The app reports an effective ATT MTU of **512 bytes** for its nRF Connect session, above the nominal **247 minimum** needed for 244-byte characteristic values (ATT Write Request payload <= MTU−3). But the wording "Requested MTU not supported" and Android platform MTU behavior mean this should be recorded as **reported by app**, not independently verified by an actual 244-byte write. In particular, **Chrome uses a separate BLE/GATT session** and may negotiate a different effective MTU. No characteristic write size has yet been validated in Chrome.

**Link finding:** Error 8 identifies a **connection supervision timeout**, strengthening evidence that unexpected browser disconnects also relate to underlying link loss rather than an InkLink-only JavaScript issue. It does **not** determine why radio/link responses stopped (clock sleep, signal conditions, Android/BLE handling are still hypotheses). Do not add speculative keepalive writes.

**Display measurements:** user subsequently measured visible area approximately **84 × 62 mm**, close to published active-area **84.8 × 63.6 mm** for generic 4.2-inch 400×300 tri-colour e-paper panels. This strongly supports, but does not conclusively prove, that resolution/driver.

**Next engineering step:** evaluate original XLY95 main-page transfer/refresh process, duration of 126 packets, BLE write-with-response capacity as exposed via Web Bluetooth, a failure-safe disconnect/recovery/clock-mode restoration plan, and independent byte-exact image packet fixtures. **Keep actual NRF- image upload disabled** until a supervised reversible trial is defined. Never probe by sending dummy frames.

## Engineering checkpoint Q — offline interrupted-transfer simulator (no hardware writes)

**14 October 2026.** Added `src/dash-simulator.mjs` and 6 deterministic tests for MTU capacity, packet pacing, simulated connection-window cutoff, interrupted image packet sequence, interrupted refresh, and input validation. Simulator uses existing offline image packet plan and intentionally has **no BLE API, no timer, no characteristic write, no physical transfer**.

The web Display Designer now exposes a **Simulate transfer — no Bluetooth** button and editable assumptions (MTU 23/247/512, 100–1000 ms per packet, 30–90 second link window). It estimates completed packets, image and refresh duration, checks `MTU - 3` against 244-byte packets, and treats incomplete transfers as requiring a validated restart rather than blindly resuming.

**Illustrative 400×300 default:** 126 packets × 200 ms = 25.2 s image data, plus an assumed 4 s refresh = **29.2 s** total. This is a model only: 200 ms/packet and refresh duration are NOT measured on this device, nRF Connect MTU does not verify Chrome MTU, and an idle disconnect window is NOT a confirmed timer. Actual 244-byte Chrome writes, transfer correctness and recovery remain unverified. **NRF- Send to Clock upload stays blocked.**

**Next:** user checks offline simulator in Android Chrome, explores slower packet scenarios and reports its output. Follow with source analysis of refresh/recovery and BLE write capability before any supervised image upload.


## Test record R — Android Chrome offline simulator verified (both scenarios)

**Date/time:** 14 October 2026 ~21:26 Sydney. User provided two screenshots of the InkLink Display Designer simulator in Android Chrome; no clock image packets were transmitted.

- **Fast hypothetical case:** MTU 512, 200 ms/packet, 55-second link lifetime, 126 packets, 25.2 s estimated image writes + assumed 4 s refresh = **29.2 seconds**, **126/126** complete, outcome **fits assumptions**.
- **Slow hypothetical case:** MTU 512, 600 ms/packet, same 55-second lifetime, 126 packets, 75.6 s estimated image writes + assumed 4 s refresh = **79.6 seconds**, estimated **91/126** packets before interruption, outcome **interrupted during image**.
- Both screenshots agree with the simulator's expected arithmetic and demonstrate working mobile UI. Timing values and the 55-second disconnect window are **user-selected assumptions**, not measurements of real Chrome BLE transfer throughput or a proven fixed firmware timeout.
- Confirmed: client-side simulator behaves as expected in Android Chrome. **Not confirmed:** Chrome's effective MTU, 244-byte write acceptance, actual image-transfer duration, safe interruption recovery, physical rendering, EPD refresh behavior.

**Next engineering action:** compare the exact XLY95 upload/refresh sequence, establish a safe recovery/clock restoration procedure and browser write-length constraints. Preserve the NRF- image-upload block until a controlled test is fully specified.

## Research checkpoint S — XLY95 image write/refresh audit, no hardware transfer

**14 Oct 2026, upstream source verified:** original XLY95 `index.html` uses `sendBufferData` with `my_step=480` hex characters (240 binary data bytes), an EPD `writeValueWithResponse()` for each 03/04 packet, followed by BW then red image planes where applicable. `upload_image()` waits **300 ms** after data packets and sends `01` full-screen or `AA` partial-screen as another **EPD acknowledged characteristic write**. This is distinct from clock-mode `E1` and RXTX `E2`; a transfer should not be considered complete before the EPD refresh step. The original source lacks a proven partial-image resume/rollback protocol. Its reconnection function is not proof of a safe image recovery mechanism.

**Engineering artifact:** `src/dash-preflight.mjs` pure audit (plane order, offset progression, packet length, optional ATT MTU-3 size check, byte total and refresh opcode) plus five tests. Simulation UI displays PASS or BLOCKED next to assumptions. **No Web Bluetooth calls or real uploads** added; `NRF-` upload remains explicitly disabled.

**Next:** independently establish Chrome actual characteristic write capacity, practical throughput, and a safe restore path on partial transfer before supervised first upload. XLY95 source uses acknowledged writes but acknowledgment does not guarantee complete display refresh.

## Test record T — Android Chrome offline image preflight PASS

**Date/time:** 14 October 2026 ~21:41 (screenshot provided in conversation). The user ran **Simulate transfer — no Bluetooth** on the deployed InkLink site using the 400×300 preview, assumed ATT MTU 512, assumed 200 ms per packet, and simulated 55-second link lifetime.

**Visible result:** 126 packets, 30,000 image payload bytes, simulated image time 25.2 seconds plus *hypothetical* 4-second refresh = 29.2 seconds; 126/126 complete within assumptions. The new **Offline sequence audit PASS** independently reported 126 ordered packets, 30,000 image bytes, **BW chunks → red chunks → 300 ms wait → EPD refresh**, and **No BLE writes**.

**Confirmed:** the latest deployed Android Chrome app executes the source-derived sequence auditor and simulator successfully. This is a browser functional test only. The audit assumes MTU 512 based on nRF Connect, not Chrome; neither timing nor 244-byte accepted writes nor actual panel rendering have been measured on the hardware.

**Next milestone:** validate Android Chrome's actual GATT write capacity and develop a safe interrupted-upload restoration plan, preferably by researching read-only device capabilities and documented XLY95 behavior. No experimental payloads or uploads until risks/rollback path are understood and user expressly approves a supervised trial.

## Engineering checkpoint U — Chrome capability inspection without packet writes

**14 October 2026, engineering change, device validation pending.** Added pure `src/ble-capabilities.mjs` plus 4 tests. Display Designer now offers **Inspect connected EPD capability — no writes**. The report reads properties of the existing `NRF-` EPD characteristic and detects presence of the browser's `writeValueWithResponse` method; it never calls any GATT write/read operations or sends a packet. The browser API does not expose a trustworthy numeric negotiated ATT MTU to JavaScript, so read-only inspection cannot prove that 244-byte EPD writes will work. MTU 512 from nRF Connect was negotiated/reported in a different Android connection.

**Next test:** User connects clock in Safe mode, navigates to Display Designer, taps the read-only capability inspector and shares the reported result. Do not send synthetic 244-byte probes. Recovery from an interrupted image remains unverified; original XLY95 has no confirmed mid-frame resume/rollback command.

## Test V — connected Chrome EPD write-capability inspection PASSED

**14 October 2026 ~22:03 Sydney (user screenshot).** On the live InkLink web app in Android Chrome, after connecting to the NRF- clock, user clicked **Inspect connected EPD capability — no writes**.

**Exact visible diagnostic:** `Acknowledged EPD writes are exposed. Chrome Web Bluetooth does not provide a negotiated ATT MTU or a non-writing way to prove a 244-byte write will succeed. EPD characteristic write property: true; acknowledged write method: true; legacy write method: true; no-response property: false.`

**Confirmed on the user's actual browser/session:** The NRF- EPD characteristic is discovered, exposes a writable-with-response property and both modern acknowledged-write and legacy write browser methods. There was **no test packet, data upload, MTU measurement or physical screen modification** during this check. Write-without-response is **not advertised**, and the eventual image implementation should use acknowledged writes as XLY95 does.

**Not proven:** Chrome's negotiated ATT MTU, acceptance of a 244-byte characteristic write, 126-packet transfer throughput, safe refresh of a complete image, or mid-frame rollback. nRF Connect's earlier MTU 512 was reported in a separate BLE connection. This read-only milestone does not authorize sending an image.

**Next:** Evaluate a transparent, manual, supervised **full-image** test with explicit user consent and abort handling only after a reversible/known-good recovery plan is documented. Avoid dummy characteristic writes (which might be interpreted as image commands). Keep actual `NRF-` upload disabled until agreed.

## Next engineering work — confirm MTU, real panel dimensions and restore behavior (PENDING)

1. **MTU test (non-image, no attribute writes):** Disconnect InkLink and XLY95. Open nRF Connect on Android; connect the NRF- clock; device ⋮ → Request MTU → 247; view the log and report what the device negotiated. A value below 247 means an ordinary 244-byte Write Request cannot fit in that nRF Connect session. Even 247 or greater there does **not** guarantee Chrome negotiated as much.
2. Independently identify the clock's panel resolution and controller (photo of rear model label or packaging, removing/hiding any serial/MAC details). The 400×300 web preset is not enough.
3. Validate whether the clock accepts full transfer framing, elapsed time vs approximately one-minute idle disconnections, original refresh/image activation and Clock-mode return. Do not send test image packets until those are resolved and the user agrees to a supervised attempt.
4. Keep the dual-profile BLE controls and NRF- upload safety guard unchanged during research.

### Outcome template for future sessions

Copy and fill this in when the user reports results:

| Field | Result |
| --- | --- |
| Date / build commit | 2026-10-14, corrected dual-profile build, latest specific source commit TBD |
| Browser / OS | Android Chrome / exact version if known |
| Device advertised name | NRF-... |
| XLY95 works in same browser? | **Yes; correct services connected at ~19:37:08; disconnected at ~19:38:07 in idle test** |
| BLE picker found device? | **Yes (verified at 19:01)** |
| `gatt.connect()` success? | **Yes (verified at 19:01)** |
| EPD service/characteristic found? | **Yes (verified at 19:01)** |
| RXTX service/characteristic found? | **Yes (verified at 19:01)** |
| Notifications work? | **Subscription succeeded at 19:21:57; no incoming payload verified; disconnect 10s later** |
| Time sync affects screen? | **YES — user confirmed time was synced at 19:46:28 (Test K)** |
| Mode controls affect screen? | **YES — user confirmed Calendar E1 01/E2 and Clock E1 02/E2 switched physically at ~19:53 (Test L)** |
| Actual error/log excerpt | **Time sync DD/E2 succeeded 19:46:28; GATT dropped after 51.4s. Earlier idle drops: InkLink 33.5s/57.2s, XLY95 ~59s after discovery.** |
| Next engineering action | **Android Chrome offline inspector PASSED (record N). Next request nRF Connect MTU 247 (read-only negotiation) and independently verify clock panel dimensions.** |

**Change history discipline:** append only verified new evidence, mark hypotheses accordingly, and update [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) current status and [ROADMAP.md](ROADMAP.md) accordingly.
