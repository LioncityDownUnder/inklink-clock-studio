# Roadmap and next-session checklist

**Checkpoint AE (first-trial preparation approved, NOT execution):** user accepted the risks of considering a supervised real image transfer. Added strictly no-write readiness checklist and four tests (68 expected total). Chrome 244-byte packet acceptance, partial-image rollback and controller identity remain unverified. Physical NRF- image upload stays disabled, and a separate explicit start approval is required before transmitting any packets.


**Checkpoint AC — stalled-write UI warning built (not hardware):** pending-write observer distinguishes long-unresolved write from failure, mock 'packet 25 stalls 4.5s' and cancel-after-settle handling. Four new observer tests + two mock integration tests (target **64** total). Next browser check: run pending-write scenario; optionally Cancel while warning visible, confirm no automatic refresh and clear UI state. Real NRF- image uploading remains blocked; uncertain Chrome write length and half-frame recovery require explicit risk review.


**Checkpoint AB — guarded BLE adapter review DONE in isolation:** `src/ble-guarded-writer.mjs`, eight mock tests (58 total). Rechecks connection, foreground visibility, cancellation, deadline and serialization around each acknowledged write; stops future traffic after failure. **Important:** cannot forcibly cancel a stuck in-flight Web Bluetooth write. Not imported into live app and NRF- image-upload remains disabled. Next: design non-misleading stalled-write UX and manual restoration/informed-consent boundary, then request separate permission for a physical upload.


**Checkpoint Y — transfer engine implemented but hardware DISABLED:** `src/dash-supervised-transfer.mjs` plus 8 mocked-device regression tests (46 total). Requires explicit consent and passed audit; sequential acknowledged packets with progress, AbortSignal, stop on link/write failure, EPD refresh only after complete image, no blind retry or firmware reset. This module is **not imported by live app.mjs**. Separate approval is required for any device image transfer. Next: user-visible gated adapter, operation timeout and cancellation semantics, recovery verification and manual hardware test approval.

**Dry-run checklist confirmed on Android Chrome (Test X, 14 Oct ~22:15):** User screenshot shows "Packet plan is internally valid for the chosen MTU assumption" and the full 8-step abort and restoration checklist. NO BLE writes; browser actual 244-byte acceptance and image-buffer rollback remain unknown. Next: design/test explicitly gated supervised image upload implementation, retaining NRF- Send to Clock disabled until user separately approves the risk and trial.

**Supervised upload DRY-RUN tooling implemented (Checkpoint W):** Browser Display Designer now generates a preflight/interruption checklist with `src/upload-rehearsal.mjs`, four offline unit tests (38 intended total). No image packets transmitted, actual upload remains blocked. Next: user checks dry-run output, then review real Chrome 244-byte write uncertainty and unproven EPD rollback before a separately approved first hardware trial.

**Read-only capability CHECK PASSED on Android Chrome (Test V, 14 Oct ~22:03):** EPD write property=true, acknowledged-write API=true, legacy-write API=true, write-without-response=false. User screenshot validates in-browser connection capabilities; **no actual write, negotiated Chrome MTU or 244-byte acceptance** has been tested. Next evaluate a deliberate reversible full-image trial with clear stop/recovery process; no dummy writes, no automatic resume, keep NRF- upload disabled until explicit consent.

**P1 read-only Chrome capability diagnostic implemented:** `src/ble-capabilities.mjs` checks existing EPD characteristic properties and browser acknowledged-write API, without a GATT read/write. Four tests added; intended 34 total. New Display Designer button reports that Chrome's negotiated MTU and acceptance of a 244-byte packet cannot be established without a real write. Next: user verifies read-only report; complete risk-reviewed recovery plan before considering any supervised image upload.

**Browser preflight milestone CONFIRMED (Test T, 14 Oct 2026 ~21:41):** user screenshot shows offline audit PASS in Android Chrome for 126 ordered packets/30,000 image bytes/BW→red→300ms→EPD refresh. Simulator 29.2s under assumed MTU 512, 200ms/packet and 55s lifetime. No BLE writes were sent. **Next P1:** establish actual Chrome GATT write size, source-based partial-frame recovery and safe restoration; do not enable physical upload without deliberate supervised approval.

**Preflight research (14 Oct 2026, Test S):** Original XLY95 transmits BW then red `03/04` image chunks through EPD acknowledged writes, waits 300 ms and sends EPD `01` (full) / `AA` (partial) refresh; it does **not** document safe resume of partial image transfers. Added offline `dash-preflight.mjs` order/offset/MTU/refresh audit and five tests, intended **30 total**; Display Designer simulation reports audit result. NRF- image upload stays disabled until browser write-size and recovery validation.



**Phase 2 Q (simulation-only, 14 Oct 2026):** Implemented independent NRF- transfer simulator with MTU capacity validation, projected packet throughput, hypothetical disconnect and refresh interruption, and explicit warning not to resume partial frames. Six new offline tests; intended total **25 tests**. Browser simulation is read-only. Next: validate in Android Chrome and research actual browser write size, image refresh and failure recovery. No physical image writes.

**Android Chrome simulator validation DONE (Test R, 14 Oct 2026):** MTU 512 and 55s hypothetical session: 200ms/packet => 29.2s, 126/126 packets; 600ms/packet => 79.6s, 91/126 before interruption. Both mobile screenshots match model predictions. These are not measured BLE throughput or hardware transfer results. Next: original XLY95 image refresh and recovery details, Chrome write length and safe reversible test protocol. Physical NRF- image upload remains disabled.

**Project:** InkLink Clock Studio — English BLE interface for Chinese e-paper desk clocks.

**Last reviewed:** 14 October 2026. **P0 clock controls are physically verified; next priority is safe NRF- image protocol research and offline-tested implementation, not firmware flashing.**

Legend: **DONE (code)** = implemented and source/automated-tested; **DONE (hardware)** = measured on actual clock; **PENDING** = unverified or not implemented.

## P0 — establish device connection with the corrected protocol

- **DONE (code):** detect `NRF-` vs `NRF_` names and choose their separate XLY95 implementations.
- **DONE (code):** request EPD service `13187b10...` and RXTX service `1F10` for `NRF-`, with their respective characteristics.
- **DONE (code):** Safe connection option, connection-stage log, no automatic commands in safe mode, retry discovery, explicit notifications.
- **DONE (hardware):** both NRF- EPD and RXTX services/characteristics discovered successfully; first 1.5-second idle connection check passed in Android Chrome on 14 Oct 2026 ~19:01.
- **DONE (hardware, observation only):** two physical BLE sessions: **33.5 seconds** after selection with notifications, **57.2 seconds** in Safe mode without notifications or commands; both unexpectedly disconnected.
- **DONE (hardware comparison):** original XLY95 on the same Android Chrome also disconnected at ~19:38:07, **~59 seconds after EPD/RXTX services were discovered**; this makes an InkLink-exclusive timeout less likely. Cause is still unknown; no confirmed fixed one-minute timeout.
- **DONE (hardware):** EPD `startNotifications()` succeeded at 19:21:57 on Android Chrome. No incoming notification payload has been observed.
- **DONE (hardware):** Clock time synchronised successfully at 19:46:28 via RXTX `DD ...` + `E2`, confirmed by user. Another expected-type idle disconnect occurred after 51.4s; no proved causal relationship to command.
- **DONE (hardware):** Calendar `E1 01` + `E2` and Clock `E1 02` + `E2` both completed in one connection and visibly switched physical display (user confirmed at 19:53).
- **OPEN ISSUE:** session disconnected at 19:22:07, around 10 seconds after notification subscription; a separate no-notification baseline disconnected after 57.2 seconds. **Notification is not required for the disconnect; causal role unproven**.
- **PENDING (hardware):** test whether intermittent `gatt.connect()` NetworkError recurs. XLY95 connects to same device, but both applications also disconnect after around a minute of idle time.

**Current milestone:** all P0 controls have passed physical tests: DD/E2 time sync (~19:46), Calendar E1 01 + E2 (~19:53:20), and Clock E1 02 + E2 (~19:53:39). **Next engineering action:** study XLY95's main-page NRF- EPD image pipeline, identify panel resolution and safe refresh/restore; create offline packet/encoder tests first. **No physical NRF- image uploads yet.**

**Acceptance gate PASSED:** User confirmed physical time, calendar and clock mode controls at 19:46–19:53 (records K/L in [TEST_HISTORY.md](TEST_HISTORY.md)). Long-term BLE stability remains unproven but current commands work inside the available session. Next P1 validation is byte-accurate NRF- image framing before any device write.

**Checkpoint AA (Android Chrome mock UI verified, 14 Oct 2026):** Complete mock upload at 126/126 with mock refresh, injected failure at packet 25 stopping after 24/126 without refresh, and manual cancellation stopping after 30/126 without refresh all passed per user screenshots. Development of supervised upload engine and mock UI is validated in browser, but **not on physical hardware**. Next: BLE adapter/timeout/visibility and restoration review; keep actual NRF- image writes disabled pending separate user approval.

**Test AD completed — pending-write stall and cancellation VERIFIED in Android Chrome (14 Oct 2026 ~22:50):** packet 25 remained pending, warning appeared after 1.1s, it later settled, and cancellation stopped the mock transfer at 24/126 counted without refresh or packet 26. No BLE writes. Browser mock acceptance suite fully verified; next decision concerns explicit risk consent for physical image transfer, Chrome write capacity and lack of proven interrupted-image recovery. NRF- physical upload remains disabled.

**Test AF (14 Oct ~23:01):** Android Chrome no-write first-hardware-trial readiness review executed: packet audit PASS, 126 packets/30,504 bytes. EPD characteristic marked unverified in disconnected review, but earlier connected Test V passed. Real Chrome 244-byte write acceptance and recovery of interrupted images remain unknown. No transfer authorized or performed; avoid repeating offline review.

**Checkpoint AG, first physical trial interface available:** After user approval, the separate single-attempt 400×300 NRF- upload path is gated by risk confirmation, typed `UPLOAD`, native confirmation and guarded acknowledged writes. Four fake-characteristic integration/wiring tests added (72 tests); release deployed. No actual image result yet. Next: deliberate user-initiated attempt, record Activity Log, physical display photo and any failure; do not assume success or automatically retry.

**Milestone AH (14 Oct 2026): FIRST LIVE NRF- IMAGE UPLOAD SUCCESS:** 126/126 EPD packets, refresh acknowledged in 9.3s, and real photo shows English tri-colour 400×300 image physically rendered. The 244-byte Chrome write unknown is resolved **for this session**. **Remaining defect: prominent ghosting from Chinese clock, small/pixelated footer, static face does not tick.** P1 shifts to researching safe full-refresh/clear and improved design; potential `clearScreen(cmd)` exists upstream but must NOT be sent before understanding supported argument and device effects. Restore-to-live clock after image not yet retested. Do not assume image-buffer rollback or durable BLE stability verified.

**Test AI — persistent ghosting after several minutes (14 October 2026):** physical English image remains legible, but old Chinese clock digits still visible behind it; issue persists beyond normal waiting. Research waveform/erasure and the undocumented XLY95 `clearScreen(cmd)` safely offline. Do not send an assumed clear argument or reupload blindly. Improve footer text sizing in a later deliberate update.

**Test AJ — ghosting distribution observed:** user reports ghosting equally across entire display. Focus follow-up on global erase / waveform / refresh, without asserting root cause or sending speculative BLE clears; optionally prepare offline larger-text design. No new hardware write approved.

**Test AK — built-in Clock mode clears persistent ghosting (real hardware):** after English-image ghosting, user switched to Clock mode and Chinese clock physically appeared clean. The panel is capable of clean refresh; prioritize analyzing difference between built-in clock redraw and custom-image refresh rather than asserting damaged panel. This verifies recovery of clean normal mode after a **completed** image transfer, NOT interrupted-image rollback. Do not transmit undocumented `00+cmd` EPD clear codes.

**Checkpoint AL (14 Oct 2026, ghosting research):** XLY95 full-frame image upload already uses EPD `01` after BW/red +300ms; standalone `clearScreen(cmd)` is defined **without a single call site** or known safe parameter, so DO NOT call it. RXTX Clock mode restores a clean display but firmware waveform sequence unknown from JS. No safe alternate clear operation yet. Next: identify controller/firmware or consult official driver behaviour; improve English text offline while preserving clean Clock mode.

**Checkpoint AM — safe controller research and preview typography:** XLY95 public HTML names a 4.2-inch/400×300 preset but no grounded EPD controller chip model. Unknown chipset/firmware-specific full refresh waveform; do not guess `clearScreen(cmd)`. Added optional high-contrast 2-line black footer for the clock-face **browser preview/PNG only**; five new tests (77 total). Next user action: review updated preview on Android Chrome and offer feedback. No new BLE image transfer is needed.

**Test AN (14 Oct ~23:43):** High-contrast English preview successfully inspected in Android Chrome (400×300; bold time, red date, darker legible single-line footer). Offline typography improvement validated; no physical display test or ghosting cure. Prioritize controller/firmware refresh research without changing current clean Clock mode.

## P0 — confirm non-destructive clock controls

- **DONE (code):** NRF- DD + local-adjusted time + E2 encoding from XLY95 main index.html.
- **DONE (code):** NRF- clock `E1 02` / calendar `E1 01` + E2 with 300 ms delay.
- **DONE (code):** automated tests cover the exact packet shape and mode bytes; tests run in GitHub Actions.
- **DONE (hardware):** InkLink's NRF- `DD` local-time packet and `E2` refresh succeeded at 19:46:27–28 on 14 Oct 2026; **user confirmed displayed time was synchronised**. The date/weekday component of the display was not separately described.
- **DONE (hardware):** Calendar mode `E1 01` + `E2` visibly switched the actual clock at 19:53:20 and Clock mode `E1 02` + `E2` restored it at 19:53:39; user confirmed both, same BLE session. Idle disconnects are a separate known issue.
- **PENDING (hardware):** determine if notifications contain meaningful acknowledgements/response formats.

**Safety:** only try one command at a time once BLE connection works. Image upload is disabled for NRF- and should remain disabled.

**Core controls DONE:** user confirmed physical changes for time sync, calendar and clock mode, each with successful RXTX write logs. No persistent command errors in these tests; idle BLE disconnect remains independently observed.

## P1 — implement correct NRF- image upload

**Phase 2 checkpoint (Test M, implemented/offline):** Strict original-XLY95 black/white/red image packing (including reversed-x 296/212/250 presets), 03/04 offset packet planning, and a read-only Display Designer packet inspector are now coded. Ten new offline tests join the nine existing protocol tests (**19 total**, CI passing). **No hardware image writes**; real panel/MTU/refresh/restore validation is the gate to enable uploads.


- **DONE (source/algorithm):** mapped original main-page `canvas2bytes`, `canvas2bytes_bw`, `upload_image`, and `sendBufferData`; use strict opaque pure black/white/red quantization. Independent BLE packet captures are still pending.
- **PENDING (highest priority):** determine exact physical screen resolution/driver and supported colour planes; XLY95's selected **400×300** canvas is NOT an independent hardware measurement.
- **PENDING (highest priority):** original NRF- frame requires a 244-byte acknowledged GATT characteristic write; ATT Write Request value ≤ MTU−3 means **negotiated ATT MTU ≥247** is needed for that size. Read actual nRF Connect negotiated MTU non-destructively; do not assume Chrome gets identical MTU.
- **DONE (offline code):** implemented `03/04 + FF/00 + 16-bit big-endian byte offset + up to 240 image bytes` packet builder in `src/dash-image.mjs`, with correct full/partial refresh metadata but **no device writes**.
- **PARTLY DONE (source):** original XLY95 `upload_image()` finishes by sending EPD `01` for full images, `AA` for 280×100/400×180 partials; offline plan reports these codes. **PENDING** physical image mode/refresh/restore verification and negotiated 244-byte BLE write support.
- **DONE (source-derived automated tests):** ten new cases for planes, row/column orientation, chunk headers/offsets, partial images, strict palette and 400×300/800×480 plans; **PENDING** independent captured-packet comparison and MTU validation.
- **PENDING:** with explicit user agreement, send a simple small/blank test image first only after screen dimensions and packets are confirmed.
- **PENDING:** enable `Send image` only after a confirmed physical transfer.

**DONE (Android Chrome, Test N):** User ran the offline inspector with 400×300 preset; it returned **126 packets, 15,000 BW + 15,000 red bytes, 30,504 framed bytes, max 244 bytes/packet, refresh 01**; no BLE transmission. **NEXT safe check:** nRF Connect device menu → Request MTU 247 and report **negotiated MTU**. This is a separate session from Chrome and cannot by itself prove Chrome's packet-write capacity. Independently identify clock panel geometry/model.

**Ultimate done when:** repeated, user-approved physical image uploads render correctly, without breaking built-in clock mode, with a verified restore path.

## P1 — reliability / UX and code health

- **PENDING:** compare Android BLE stability with XLY95 under same conditions; record browser and Android version if relevant.
- **PENDING:** add copy/export Activity Log button without exposing MAC/account identifiers by default.
- **PENDING:** add clearer `NRF-` / `NRF_` protocol indicator, read-only device information and guarded error recovery.
- **PENDING:** test mobile responsive layout and actions after real device success; avoid assuming headless tests validate Bluetooth.
- **PENDING:** create browser-mocked GATT tests per profile, including missing service, notification failure, and disconnect during request.
- **PENDING:** ensure README and old standalone HTML downloads are not mistaken for the GitHub Pages build. The deployed `src/` modules are authoritative.

**Observation AO (14 October 2026):** physical built-in clock shows battery level + temperature, and the user reports three styles cycling with repeated Clock mode presses. InkLink RXTX `E1 02`+`E2` already triggers this behavior; no new protocol needed. UI help updated. For future live-English feature research: identify whether battery/temperature telemetry can be **read** via verified GATT, and obtain photos of three clock layouts. Do not claim sensor origin, state query, or available BLE temperature/battery values before testing. Offline uploaded English picture remains static.

**Test AP (three user photos):** all 3 firmware-clock layouts physically verified: giant digits, split analog/digital + calendar, full Chinese lunar-month calendar. Firm visual evidence of **3.9V battery voltage**, **21°C**, lunar information and solar-term labels. Source of telemetry and BLE accessibility remain unverified. Faint ghosts of prior large digits can be seen in some non-primary native layouts, so do not generalise Test AK's clean Clock mode to all native transitions. App helper copy updated only. Future step: read-only identify clock's GATT services/characteristics; prioritize ability to access voltage and temperature if supported.

## P2 — enhanced clock features

- **PENDING:** English screen layouts suited to actual physical resolution and red-plane capabilities.
- **PENDING:** consider extra XLY95 controls (font/colour/rotate, sleep, settings) only after reviewing per-command risk and confirming correct RXTX channel.
- **PENDING:** optional personalised dashboards: appointments, Sydney weather, transport, reminders.
- **PENDING:** investigate refresh cadence and battery impact; a static image upload does not create a continuously updating standalone clock.

## P3 — sustained/automated updates

- **PENDING:** identify whether the firmware can render dynamic English text itself or needs regular image uploads.
- **PENDING:** if regular uploads are needed, evaluate a foreground browser, local BLE gateway or supported OS background mechanism; GitHub Pages alone cannot silently maintain an offline BLE connection.
- **PENDING:** optional firmware research is a separate, higher-risk hardware reverse-engineering project, not part of the initial Bluetooth app.

## Project maintenance checklist (every subsequent chat)

1. Read [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) before starting; fetch current `main` files from the GitHub connector.
2. Inspect [BLE_PROTOCOLS.md](BLE_PROTOCOLS.md) and [TEST_HISTORY.md](TEST_HISTORY.md) and check [Actions](https://github.com/LioncityDownUnder/inklink-clock-studio/actions).
3. Ask only for the **missing next physical observation**, not information already confirmed in logs.
4. Develop/test/commit targeted code changes; CI must check JS syntax and run unit tests before Pages deploy.
5. Record result/commit in `TEST_HISTORY.md`; update `PROJECT_HANDOFF.md` status/next step; update this roadmap and protocol details as needed.
6. Keep all device-write actions deliberate; do not re-enable NRF- image transfer until implemented and validated.
7. Do not store the user's MAC address, sensitive details or personal screenshots in the public repository.
