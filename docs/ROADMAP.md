# Roadmap and next-session checklist

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
