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

## Engineering checkpoint W — upload rehearsal and conservative interruption procedure (no BLE writes)

**14 October 2026.** Prepared a dry-run supervised image workflow, not a real upload. Added `src/upload-rehearsal.mjs` and four offline tests. Android Chrome Display Designer now provides **Prepare dry-run upload checklist**, showing plane/packet validation, assumed MTU gating, and conservative steps: stop on first failed write, never refresh incomplete buffers, never resume from arbitrary offsets, don't automatically retry or assume Clock mode clears image memory. The UI explicitly states hardware write size, actual refresh and rollback remain unverified and that uploads are not authorized.

**Next hardware-neutral validation:** user opens deployed InkLink Display Designer and runs checklist, confirms no BLE writes. Before any full image transmission, independently evaluate Chrome accepted 244-byte writes, panel compatibility and an interruption recovery strategy; separate explicit informed approval is still required.

## Test record X — supervised image-upload DRY RUN checklist completed in Android Chrome

**Date/time:** 14 October 2026 ~22:15 Sydney. User supplied screenshot showing **Prepare dry-run upload checklist** executed successfully in the live InkLink Display Designer. The output says **DRY RUN ONLY — NO DEVICE WRITES** and **Packet plan is internally valid for the chosen MTU assumption**. The checklist listed all eight safety steps: confirm panel/device, Safe connection/close other BLE apps, explicit informed approval, acknowledged BW-then-red image writes with stop on first error, no EPD refresh after incomplete data, wait 300 ms then EPD refresh after complete data, visually inspect and only then consider Clock mode, and never automatically resume after disconnection.

**Critical limitation:** The screenshot explicitly notes Chrome MTU/write acceptance and rollback are **NOT verified** and upload **NOT authorized**. Successful rehearsal does not prove a 244-byte packet will be accepted or the physical display can be restored after a mid-frame disconnect. No actual EPD image writes were sent. Avoid implying a physical upload is already safe or complete.

**Next:** Deliberately design a supervised full-image test with progress, cancellation, first-error abort and manual restoration controls, but retain hardware upload disabled until user reviews risks and provides **separate explicit authorization**. Do not run dummy probe packets or assume clock-mode restoration is a verified image-buffer rollback.

## Engineering checkpoint Y — supervised transfer ENGINE tested with mocks, NOT activated

**14 October 2026.** Added `src/dash-supervised-transfer.mjs`, a hardware-independent stateful transfer routine that accepts only an injected acknowledged-write callback and checks connection/cancellation at packet boundaries. It requires `consent:true` and offline audit pass, transmits sequential BW/red frames under caller control, waits 300ms and writes the EPD refresh **only after all image writes resolve**. No blind resume, automatic retry, reconnect, reset or mode restoration. It reports progress and acknowledges that successful refresh write does **not** prove actual pixels appeared.

**Tests:** Eight mocked transfer tests cover missing consent, failed audit, ordered writes + refresh, packet rejection, GATT loss, AbortSignal before subsequent packets, abort after full image before refresh, and invalid inputs. GitHub Actions full suite now totals **46 tests**. None are real device writes.

**Hardware boundary:** `src/app.mjs` does **not** import/call the engine; `NRF-` upload UI is still explicitly disabled. Risks remain: Chrome 244-byte write acceptance, ~1-minute supervision timeout, image-driver geometry, safe restoration of a partially written EPD frame, and the fact that in-flight Web Bluetooth writes cannot be forcibly cancelled mid-promise. No physical image upload authorization was given—the user approved **building** the feature only.

**Next:** test a separately gated UI adapter and deliberate consent/cancellation flow, without activating a real write path until explicit informed user approval.

## Test record AA — ALL THREE mock supervised upload UI tests PASSED on Android Chrome

**14 October 2026, ~22:30–22:31 Sydney.** User supplied three screenshots of the deployed InkLink Display Designer **MOCK MODE ONLY** controls. These confirm the actual Android Chrome UI execution of the previously automated-tested in-memory transfer code. Screenshots remain in conversation and are not published to the public repository.

1. **Successful mock transfer (~22:30:05):** "All mock packets succeed" → full progress bar, `126/126` image packets, `waiting-to-refresh`, `refreshing`, `refresh-write-acknowledged`; final text: `MOCK completed: 126/126 and mock refresh acknowledged. Physical display NOT verified; no Bluetooth writes.` **PASS**.
2. **Injected write failure at packet 25 (~22:30:41):** `24/126` packets previously acknowledged, then `stopped-incomplete-or-unknown`, with `SIMULATED packet failure at 25`. No refresh step appears. **PASS**.
3. **User cancellation (~22:31:25):** mock writer stopped after pending write, `30/126` packets completed; log shows `stopped-incomplete-or-unknown` and no refresh operation. **PASS**.

**Interpretation:** manual cancellation and failed acknowledged writes halt subsequent packets and suppress the simulated refresh; complete mock transfers progress through refresh. This does **NOT** verify physical BLE uploads, negotiated Chrome MTU, firmware reaction to 03/04 image frames, screen update or recovery of half-written image buffers. The current `NRF-` Send to clock button remains disabled.

**Next:** Review the actual BLE adapter design for operation timeouts, cancellation between in-flight writes, browser visibility, user consent and manual Clock-mode restoration. Do NOT enable device transmission merely on the basis of the mock test results. Any first hardware trial requires separately informed and explicit approval.

## Engineering checkpoint AB — isolated fail-closed BLE adapter review (NOT activated)

**14 October 2026:** Added `src/ble-guarded-writer.mjs` plus eight mock tests; suite now **58 tests**. Adapter exposes a wrapper for acknowledged EPD characteristic writes with connection, foreground visibility, cancellation, operation deadline, exclusive in-flight write and post-write safety checks. A rejected GATT write permanently blocks subsequent calls. **No live app import or image upload invocation**; the existing `NRF-` Send to clock guard is unchanged.

**Limit:** if Chrome's characteristic write promise hangs, neither AbortSignal nor a local timer can forcibly terminate its underlying radio operation; checks can only stop further traffic when control returns. The adapter does not independently solve actual negotiated MTU, 244-byte write acceptance, recovery of half-written e-paper buffers, or a possible indefinite pending BLE write. No live upload approved or performed. User previously confirmed 3/3 browser mock scenarios; no new physical test required yet.

## Engineering checkpoint AC — stalled acknowledged-write warnings (NO BLE image writes)

**14 Oct 2026:** Implemented pure `src/pending-write-monitor.mjs` which emits a warning after configured elapsed time without forcibly settling an in-flight promise. Added UI mock scenario 'Packet 25 stalls for 4.5 seconds (mock only)', with 1-second warning. Cancellation during pending mock write requests stop, but no new packet or refresh occurs after the fake write settles. Four monitor unit tests and two runner integration tests target total **64 automated tests**.

**Crucial distinction:** warning threshold is **not** a radio write timeout, device acknowledgement failure, safe disconnection, image-buffer rollback or proof a pending browser promise can be terminated. Actual `NRF-` Send to clock is STILL DISABLED. User browser validation of the stall scenario pending.

## Test AD — Android Chrome mock pending-write cancellation PASSED

**Date/time:** 14 October 2026 at ~22:50 Australia/Sydney. User shared the complete text log from the deployed **MOCK MODE ONLY** 4.5-second stall test and pressed Cancel while packet 25 was pending.

**Log evidence:** 22:50:04 mock started for 126 image packets, 22:50:05 reached 20/126, 22:50:06 warned `MOCK packet 25 still pending after 1.1s. This is NOT a confirmed timeout or cancelled write; please wait.`, 22:50:09 `MOCK pending packet 25 resolved`, then `stopped-incomplete-or-unknown — 24/126`, with final `MOCK stopped: Mock aborted after pending write`.

**Observed PASS:** warning accurately distinguished a still-pending mock write from failure; cancellation did not force resolution of the in-flight operation; when it settled, the mock stopped, **did not count packet 25 as an acknowledged completion, did not start packet 26 and did not issue mock EPD refresh**. No Bluetooth image data was transmitted. Important distinction: `24/126 completed` is an *application acknowledged count*, not proof the peripheral did or did not receive an in-flight write in a real BLE session.

**Next:** no need to repeat this mock. The remaining gate is an explicitly consented and risk-reviewed real image test with Chrome 244-byte write capacity and incomplete-frame recovery still unknown; live NRF- Send to Clock remains disabled.

## Checkpoint AE — User accepted first-trial risk; PREPARATION only

**14 Oct 2026.** User answered **yes** to accepting the risks of preparing a supervised physical upload. This is not immediate authorization to send any bytes to their clock. Implemented `src/first-trial-readiness.mjs` and a Studio **Review hardware trial readiness — no writes** panel, with four new tests intended to bring total to **68**. This checklist never sends BLE data and always reports physical image upload disabled.

**Open concerns:** Android Chrome acceptance of 244-byte EPD writes remains unverified; clock firmware recovery from partial frame is unknown. Clock-mode command is not proven to roll back EPD RAM. A user-facing readiness report must not conflate willingness to prepare with consent to execute. Keep image send guarded.

## Test AF — first physical-upload readiness review completed (NO device writes)

**14 October 2026 ~23:01 Sydney.** User supplied screenshot of Android Chrome "Review hardware trial readiness — no writes". Report confirms **126 packets / 30,504 estimated characteristic bytes** and **PASS: Packet sequence audit**. It marks selected 400×300 profile, Chrome acknowledged EPD write interface, actual 244-byte characteristic acceptance, and interrupted-image recovery as UNVERIFIED *in this run*. No Bluetooth data sent; real image upload remains disabled.

**Interpretation:** The acknowledged-write interface previously passed a separate **connected** Chrome test (Test V). Its "UNVERIFIED" status here reflects that this review did not have an active NRF- connection, not a regression. Physical panel active area measured ~84×62mm, strongly consistent with common 400×300 tri-colour panels, not independently identified by part number. Actual Chrome 244-byte acceptance and interrupted image-buffer recovery remain unknown.

**Next:** before any user-confirmed physical image trial, present the real risks and require an explicit start action; do not represent passing a read-only checklist as authorizing image writes. No further identical offline readiness tests are necessary.

## Checkpoint AG — approved first supervised hardware trial, not yet executed

**14 October 2026.** User explicitly approved proceeding toward the first real image upload. Added a separate one-attempt, user-confirmed interface for 400×300 NRF- images, with connected-device check, risk acknowledgement, typed confirmation, native confirmation, sequential acknowledged writes, progress log and stop request. On failure no refresh, retry or automatic restoration. Four integration tests use fake characteristics (72 automated tests total). The production code deployed successfully, but **no hardware image-transfer result has been reported**. Chrome 244-byte write acceptance and interrupted-image recovery remain uncertain. Await the user's deliberate action and physical observation.

## Test AH — FIRST PHYSICAL NRF- IMAGE UPLOAD SUCCEEDED (with ghosting)

**14 October 2026 ~23:12–23:13 Sydney. USER SCREENSHOTS ARE DEFINITIVE EVIDENCE.** Android Chrome InkLink's single-attempt live image upload reported all **126/126** image packets acknowledged, EPD refresh write acknowledged at **23:12:56**, and **9.3 seconds** total until refresh acknowledgement (not necessarily full pigment settling). Physical photograph shows the new **400×300 English tri-colour face rendered on the clock**: "SYDNEY TIME" heading, black **23:12**, red "WEDNESDAY 14 OCTOBER 2026", footer text visible. This confirms real NRF- BLE EPD image transfers, and Chrome accepted the 244-byte characteristic image packets on this session. This is the first proven physical image rendering, not just a simulator.

**ISSUES VISIBLE IN PHYSICAL PHOTO:** substantial faint original Chinese clock numerals and footer remain behind new English design (**ghosting/incomplete old-image erasure**); bottom English slogan looks small/pixelated or partially broken. New face is a **STATIC 23:12 snapshot**, not a live ticking clock. Do not claim full panel clearing or long-term stability. Do not repeatedly reupload to troubleshoot without weighing e-paper wear/refresh behaviour and obtaining user approval.

**Upstream discovery for next R&D:** original XLY95 main `index.html` defines `clearScreen(cmd)` which calls `triggerEpdCmd('00'+cmd)` then `triggerEpdCmd('01')`. It also uses EPD `01` after full-image upload. **ClearScreen's permitted argument and safety/driver effects are not established on this physical clock**; do not run it without source analysis and fresh explicit user approval. Investigate full refresh / clearing, pixel contrast, dither/text legibility offline first.

**Next:** Record current clock behaviour: does 23:12 remain static; does clock/calendar restoration via earlier working controls operate after image mode. Study XLY95 clear/refresh paths and generate a higher-contrast / larger footer design offline. No BLE writes to diagnose ghosting unless separately agreed.

## Test AI — persistent ghosting confirmed after waiting (14 October 2026)

User reported that the original Chinese clock digits/labels **remain visibly ghosted after several minutes** following the first successful English 400×300 upload (Test AH). This excludes an explanation based solely on a slow visible post-refresh settling period. The English design is physically rendered, but not cleanly erased against the prior image. No additional BLE write was attempted in this follow-up.

Read-only upstream investigation: XLY95 `index.html` contains `clearScreen(cmd)` which calls `triggerEpdCmd('00'+cmd)` followed by `triggerEpdCmd('01')`. The helper argument is unspecified, and no actual use of this function was located in the inspected source. **Do not invent an argument or send clear/refresh commands speculatively.** The source also has `clear_canvas()`, which only whitens the webpage canvas and does NOT clear physical e-paper.

Possible explanations include incomplete erasure/refresh waveform or residual image persistence when changing from built-in clock to custom image; neither is verified. Next: read-only research into precise driver/full refresh and safe recovery, then perhaps redesign the tiny footer for legibility. No more physical writes without a new user-approved test.

## Test AJ — ghosting reportedly uniform across full display

**14 October 2026 (user follow-up).** After the first physically successful English upload and several minutes of waiting, user reports ghosting **appears equally across the entire screen**, rather than being concentrated around the old large Chinese clock digits. This is a qualitative observation, not a measured optical-uniformity test. It prioritises investigating **full-panel erase / refresh waveform / residual charge or inadequate pigment transitions** over fixing only the old-digit region. Ghosting from prior image remains visible and the current English face is a static image. The actual root cause is not yet identified.

**Safety:** do not issue undocumented EPD `00+cmd`/refresh commands, guess clear parameters, or repeatedly reupload solely to see whether ghosting disappears. Investigate whether the device's manufacturer clock-mode full update (previously working) provides any documented safe clearing approach. Offline font contrast/spacing improvements can proceed separately. No new device writes in this investigation.

## Test AK — normal Clock mode restores CLEAN physical screen after custom-image ghosting

**14 October 2026 (user-reported direct observation).** After the first verified physical English image upload (Test AH) left persistent, display-wide ghosting (Tests AI/AJ), the user connected via InkLink and selected the previously tested **Clock mode**. **Result: the original Chinese clock face appeared CLEAN, without ghosting.** This is a successful post-custom-image restoration on the real hardware, not merely a command acknowledgment.

**Supported inference:** display can achieve a clean result using built-in Clock mode; ghosting on the custom English image is not evidently permanent panel damage. A different or more thorough refresh/erase sequence is plausible but **not yet proven**. This test does NOT establish that Clock mode can safely recover a partially transmitted EPD image buffer or that sending an undocumented EPD clear command is safe.

**New development priority:** read-only compare built-in mode commands (RXTX `E1 02`, `E2`) with the custom image EPD `01` refresh. Investigate verified firmware behavior or documented waveform/refresh parameters; avoid speculative EPD `00+cmd` commands. Optionally improve English footer legibility offline, but only undertake another image write with separate deliberate user approval.

## Checkpoint AL — XLY95 source audit finds NO validated ghosting-clear command

**14 October 2026, research only:** Reviewed XLY95's original public `index.html` after Test AK's clean hardware Clock-mode restoration. `upload_image()` sends BW/red planes then EPD `01` after 300ms, exactly the style used for InkLink's successful first English image. `clearScreen(cmd)` occurs once as a function **definition only**, with no call site showing a safe `cmd` argument; it would write EPD `00+cmd` followed by `01`. `clear_canvas()` clears the web canvas only. The clean built-in Clock mode occurs via RXTX `E1 02` then `E2` and its internal waveform/erase behaviour is not revealed by the webpage's source.

**Conclusion:** no source-grounded extra EPD cleaning command can responsibly be added yet. We should not claim that another `01` or a guessed `00` code will cure persistent ghosting. Keep device in clean original mode and seek controller/firmware documentation; prepare typography improvements offline if desired. No BLE commands or image writes occurred in this research.

## Checkpoint AM — controller research and offline English clock typography

**14 October 2026; NO HARDWARE WRITES.** Public XLY95 page recognizes a 4.2-inch 400×300 profile but no literal common controller part identifiers (`SSD1683`, `SSD1680`, `UC8176`, `UC8276`, `JD796`, `IL0398`). The actual clock's controller, waveform and reliable panel-wide erase protocol remain unknown. This cannot be reverse-engineered from a screenshot alone. Existing normal Clock mode returns a clean display; static English image produced persistent ghosting.

Implemented `src/clock-typography.mjs` and checkbox `High-contrast English clock layout (preview only)` in Display Designer. The clock preview and downloaded PNG now allow a larger, black, 1–2-line footer. It does NOT add any new BLE operation or attempt ghosting repair. Five new offline tests bring suite to **77**. Review the layout on Android Chrome; no need to touch the physical clock.

## Test AN — Android Chrome high-contrast English preview PASSED

**14 October 2026 ~23:43 Sydney, screenshot supplied by user.** The live 400×300 canvas shows "SYDNEY TIME", large bold black **23:43**, clear red **WEDNESDAY 14 OCTOBER 2026**, and darker, more legible footer **A GOOD DAY TO GET THINGS DONE**, fitting on a single line. No overlapping text or obvious layout clipping appears in the screenshot. This verifies the updated browser preview, **not** hardware e-paper contrast, panel ghosting repair or a second image upload.

**Hardware state:** Last observed real display was clean original Chinese Clock mode after restoration (Test AK). No new BLE image write is requested or evidenced by this screenshot. High-contrast option only changes preview and any *future separately confirmed* image. The root cause of persistent ghosting during custom-image mode is still unknown.

**Next:** keep clean clock mode; investigate verified full-screen erase/refresh from actual firmware/controller evidence before further physical image experiments. Do not ask user to repeat successful preview test.

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
