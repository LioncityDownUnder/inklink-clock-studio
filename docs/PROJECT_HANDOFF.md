# Project handoff — InkLink Clock Studio

> **CHECKPOINT AC — stalled write UX (14 Oct 2026):** Added pure `src/pending-write-monitor.mjs` and warning-only mock scenario (packet 25 intentionally pending 4.5s). UI displays 'still pending' after 1s but NEVER claims a browser GATT write was cancelled/failed. If user cancels, it waits until the fake in-flight write settles, then stops further writes and skips refresh. Four monitor tests plus two integration tests (expected total **64 tests**). No real BLE adapter import/image upload. Next: user confirms mock stall and cancellation UI works, then review residual risks and separately request informed authorization before any live transfer.


> **CHECKPOINT AB (14 Oct 2026):** Review-only guarded BLE writer implemented in `src/ble-guarded-writer.mjs` with eight tests (**58 total**), separate from live app. Requires acknowledged characteristic; guards against disconnect, background tab, cancellation, expired deadline and concurrent writes; rechecks after resolved writes, blocks permanently after rejected write. **Not imported by live `src/app.mjs` and no hardware image writes permitted.** An in-flight `writeValueWithResponse` cannot be forcibly cancelled if unresolved, so deadline is a stop-scheduling condition, not a hard browser write timeout. Next: inspect UI gating and stalled-write recovery semantics before any expressly authorized physical image test.


> **CHECKPOINT Z (14 Oct 2026) — supervised UI MOCK ONLY:** Live Display Designer now includes mock-only controls: acknowledgment checkbox, Start/Cancel, packet progress, deterministic injected failure at packet 25 or 75, and timestamped event log. `src/mock-transfer-runner.mjs` injects an in-memory writer into the guarded transfer engine; **no navigator.bluetooth calls or characteristic writes**. Four additional tests bring total to **50**. `src/app.mjs` still blocks `NRF-` physical image uploads and does not import an actual BLE writer for this engine. Next: test Start/Cancel/failure mock UI on Android Chrome and inspect logs. Explicit separate approval is still necessary before any real transfer.

> **CHECKPOINT Y — supervised transfer engine coded but NOT connected to live BLE (14 Oct 2026):** Added `src/dash-supervised-transfer.mjs` as an injection-based packet transfer engine; eight mocked-device tests in `tests/dash-supervised-transfer.test.mjs` bring total to **46 tests**. It requires explicit consent argument and passed offline audit, uses a caller-supplied **acknowledged-write** callback, reports packet progress, supports AbortSignal, aborts on disconnect/error, **never sends refresh if image packets are incomplete**, and never retries/resumes or automatically restores modes. **Crucially, `src/app.mjs` does NOT import or invoke this engine; the actual `NRF-` Send to clock button remains disabled.** No device image data sent. Next: review an isolated live adapter, robust cancellation/timeout/UI consent and source-verified restoration, then request separate informed approval before enabling a supervised hardware upload.

> **Next supervised-upload preparation checkpoint (14 Oct 2026):** New `src/upload-rehearsal.mjs` and Display Designer **Prepare dry-run upload checklist** button assemble the source-grounded image plan, assumed MTU check, stop-on-first-error and non-resume recovery guidance. Four offline unit tests added (38 total). No physical EPD image writes or upload authorization: NRF- Send to Clock stays disabled. Next user step: run the checklist in Android Chrome; independently assess true Chrome 244-byte write acceptance and rollback before any explicitly approved physical test.

> **Read-only browser capability checkpoint (14 Oct 2026):** Added `src/ble-capabilities.mjs` and **Inspect connected EPD capability — no writes** button in Display Designer. Once NRF- BLE is connected, the user can inspect EPD `write` characteristic property and whether Chrome exposes an acknowledged write method; **this does not send any BLE packets**. Web Bluetooth does **not** expose a standard negotiated ATT MTU property or a harmless way to prove a 244-byte write will succeed. Four new tests were added (34 total intended). Next: ask user to inspect while connected; document a recovery plan and obtain explicit user approval before any full-image hardware test. Upload remains disabled.

> **Phase 2 preflight milestone (14 Oct 2026):** XLY95's actual main page writes every BW packet to the EPD characteristic with `writeValueWithResponse`, then every red packet, waits **300ms**, and sends the single-byte EPD refresh `01` for full-screen (or `AA` partial) using another acknowledged write. It does **not** implement a validated partial-image resume or image rollback protocol. New `src/dash-preflight.mjs` runs a **pure offline** audit of packet order, byte offsets, assumed MTU capacity and refresh opcode; five new tests bring intended total to **30**. UI simulation shows audit status. No physical image writes enabled. Remaining: verify Chrome's actual write capacity/transfer reliability and establish supervised test and restore procedure.

> **Phase 2 simulator checkpoint (14 Oct 2026):** New pure `src/dash-simulator.mjs` estimates image transfer time from current packet plan, assumed ATT MTU, per-packet latency and simulated disconnect window. Display Designer now has **Simulate transfer — no Bluetooth** with selectable MTU (23/247/512), per-packet milliseconds and idle lifetime. It reports whether framing exceeds ATT capacity or a simulated drop occurs during image data versus refresh, and advises against blind resume of partial uploads. Six new tests added (`tests/dash-simulator.test.mjs`), bringing intended total to **25**. **No physical writes enabled.** Next: confirm CI/deploy, test browser simulator, investigate actual Chrome write length and recovery/refresh sequence before real upload.

> **Canonical handoff / single starting point for future chats and contributors**
>
> **Last consolidated:** 14 October 2026 (Australia/Sydney).
>
> **Status:** Core NRF- BLE control milestone **COMPLETE on real hardware (14 Oct 2026)**: EPD/RXTX discovery, notification subscription, DD/E2 time sync (confirmed at ~19:46), **Calendar mode E1 01 + E2 (confirmed at 19:53:20)**, and **Clock mode E1 02 + E2 (confirmed at 19:53:39)**. The user explicitly confirmed both display modes switched correctly. The clock has previously disconnected while idle after ~33–57 seconds, also reproduced on original XLY95, but mode switching succeeded in a single connection. **NRF- image upload remains disabled/unimplemented and is the next development priority.**
>
> **Next action:** Offline Android Chrome image inspector passed (400×300, 126 packets, 30,504 bytes, max 244-byte write), **nRF Connect separately reported MTU 512**, and measured active area (~84×62 mm) strongly suggests a 4.2-inch 400×300 B/W/R panel. **Still unknown**: Chrome session's actual 244-byte write ability, original refresh/restore protocol and full transfer time versus ~one-minute GATT link-loss episodes. Next validate these safely before offering a supervised reversible test; don't enable NRF- uploads yet.


> **14 Oct 2026 ~20:34 USER SCREENSHOT — OFFLINE INSPECTOR VERIFIED IN ANDROID CHROME:** User tapped Inspect encoded packets (offline) with 400×300 preset. Visible result: 126 packets, BW 15,000 bytes, red 15,000 bytes, total 30,504 BLE bytes, max packet 244 bytes, first header `03 FF 00 00`, last header `03 00 3A 20`, EPD refresh `01`, and explicit `No Bluetooth data was transmitted.` This validates browser execution/summary, NOT physical panel resolution or device image transfer. **Next: establish real panel dimensions and BLE MTU/write limit before any supervised transfer.**

> **New hardware observation (14 Oct 2026, Test O):** User provided full front photo and confirmed the white enclosure is **3D printed without any model label**. Active visible screen is roughly 4:3 and shows black/white/red output. **4.2-inch 400×300 B/W/R is plausible but NOT verified.** Generic active area for that class is ~84.8 × 63.6 mm, reference only. **Next ask user to measure the visible active display width and height in mm** (exclude case). Do not request disassembly. nRF Connect 0x180A Device Information may help if measurements are ambiguous. Still check BLE negotiated MTU before any 244-byte writes and keep NRF- image upload disabled.

> **NEW 20:52 Android BLE evidence (14 Oct, Test P):** nRF Connect reports `Requested MTU not supported. MTU changed to: 512` on the physical NRF- clock (twice). This is encouraging for 244-byte packets **in that session only**; Chrome effective MTU/write capability is not verified. The same app logged `Error 8 (0x8): GATT CONN TIMEOUT` on disconnect, supporting link supervision timeout as the immediate failure rather than proof of any application idle timer. Visible screen measured ~84 × 62 mm, consistent with 4.2-inch 400×300 tri-colour active area (~84.8 × 63.6 mm). **Next: source-check image refresh/restore and transfer timing, design reversible supervised test. Upload remains disabled.**

> **Browser simulation milestone (14 Oct 2026 ~21:26, Test R):** Android Chrome screenshots verified **both** no-Bluetooth scenarios. With 400×300 image (126 packets), assumed MTU 512 and 55s lifetime: 200 ms/packet yields 29.2s estimated total and 126/126 complete; 600 ms/packet yields 79.6s and 91/126 packets before simulated interruption. These are **arithmetic scenarios, not measured radio speed**, and do not authorize image upload. Next: verify exact original XLY95 refresh/recovery flow, Chrome characteristic write limits and interruption safety; keep `NRF-` Send to clock disabled.

> **Android Chrome confirmation, Test T (14 Oct 2026 ~21:41):** The deployed *offline* preflight audit visibly **PASSED**: 126 ordered packets, 30,000 image bytes, BW→red→300ms wait→EPD refresh, 126/126 packets in the assumed 29.2s/55s scenario (MTU 512 assumption, 200ms/packet). No Bluetooth writes were made. This validates client-side operation only—not browser GATT write capacity, radio timing, actual refresh or a safe recovery path. Next: verify Chrome write limits and interrupted-transfer restoration before a user-approved supervised upload. **NRF- physical image upload remains disabled.**

> **NEW VERIFIED HARDWARE CHECK (14 Oct 2026 ~22:03, Test V):** User ran the **read-only connected EPD capability inspector** successfully in Android Chrome. EPD write property **true**, acknowledged `writeValueWithResponse` method **true**, legacy write method **true**, write-without-response property **false**. Thus browser-side acknowledged-write capability is confirmed. **No packet was written** and Chrome's effective MTU/244-byte write acceptance remain unknown (nRF Connect reported 512 only in a separate session). Next: prepare user-approved reversible full-image trial with clear abort/restore procedure and no automatic resumption; keep NRF- image upload disabled until explicitly approved.

> **LATEST USER TEST (Test X, 14 Oct ~22:15):** Android Chrome screenshot confirms **Prepare dry-run upload checklist** works and shows "Packet plan is internally valid for the chosen MTU assumption"; the eight-step safety/abort checklist rendered correctly. No device writes occurred. The UI explicitly says browser MTU/write and rollback are NOT verified; Upload NOT authorized. This concludes offline preflight/browser capability/dry-run milestones. **Next priority:** plan a user-approved, supervised physical image transfer with transparent progress, first-error abort, no blind resume, no refresh after incomplete packets, manual Clock mode as an *unproven* partial-buffer recovery attempt. Keep NRF- image upload disabled pending explicit informed consent and implementation testing.

> **LATEST HARDWARE-NEUTRAL TEST (Test AA, 14 Oct 2026 ~22:30–22:31):** All THREE mock-only supervised upload scenarios passed in real Android Chrome: full `126/126` with mock refresh acknowledged; simulated packet-25 failure stopped after `24/126` and **no refresh**; manual Cancel stopped after `30/126` and **no refresh**. Thus the live browser mock UI/progress/failure/abort behavior is now user-verified. **No real BLE image writes**; physical `NRF-` upload remains disabled. Next: review separately gated BLE adapter/timeouts, visibility and recovery before requesting explicit informed permission for a supervised first real image transfer.

> **LATEST USER TEST AD (14 Oct 2026 ~22:50):** Android Chrome MOCK packet-25 stall + Cancel **PASSED**. Log shows pending warning at 22:50:06 after 1.1s, mock packet 25 settled 22:50:09, then mock stopped at **24/126 counted**, with no further packets or EPD refresh. Cancellation of a pending operation does not prove the real peripheral received nothing; a settled mock write was deliberately not counted after cancellation. **No BLE image packets sent.** User has now browser-verified complete/fail/cancel/stall mock scenarios. Do not ask to repeat. Next: assess remaining real hardware upload uncertainty and seek separate explicit informed approval only if ready, while preserving disabled NRF- image-upload guard.

## Canonical links

- Repository: https://github.com/LioncityDownUnder/inklink-clock-studio
- Live app: https://lioncitydownunder.github.io/inklink-clock-studio/
- GitHub Actions / deploy status: https://github.com/LioncityDownUnder/inklink-clock-studio/actions
- Original working clock-config site: https://xly95.github.io/
- XLY95 main-page protocol source (for **NRF-**): https://github.com/XLY95/xly95.github.io/blob/main/index.html
- XLY95 separate legacy source (for **NRF_**): https://github.com/XLY95/xly95.github.io/blob/main/js.js
- Full protocol details: [BLE_PROTOCOLS.md](BLE_PROTOCOLS.md)
- Experiment/history evidence: [TEST_HISTORY.md](TEST_HISTORY.md)
- Prioritized next work: [ROADMAP.md](ROADMAP.md)
- Agent orientation: [../AGENTS.md](../AGENTS.md)
- Current app files: [../src/app.mjs](../src/app.mjs), [../src/protocol.mjs](../src/protocol.mjs), [../src/dash-image.mjs](../src/dash-image.mjs), [../index.html](../index.html)
- Automated tests: [../tests/protocol.test.mjs](../tests/protocol.test.mjs) and [../tests/dash-image.test.mjs](../tests/dash-image.test.mjs) (19 cases)
- Deployment workflow: [../.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

## Goal and scope

Build a clean **English-language Web Bluetooth application** to connect to, control and eventually design custom e-paper displays for a Chinese-manufactured battery-powered desk clock. GitHub Pages hosts the static HTML/CSS/ES-module JavaScript UI. No backend is required for current features. This is **BLE configuration and image transfer**, not firmware flashing or microcontroller reprogramming.

Long-term: English interface, live clock/calendar control, configurable screen layouts, safely uploading static custom artwork, and possibly extended dashboard features if hardware/data delivery allow. A static image is **not** a continuously updating standalone clock face.

## Hardware context (observed vs unknown)

- Initial user photo (14 Oct 2026) shows a white e-paper desk clock with large segmented time, Chinese solar/lunar calendar and date, temperature, battery voltage, and a solar-term countdown. The display appears black/white/red. Screen size, exact display controller, SoC and firmware version **not verified**.
- User demonstrated that the actual clock can be configured using XLY95 via BLE.
- The clock advertised as **NRF-6CD319** during Android Chrome troubleshooting, i.e., it has a **hyphen**, not an underscore. Do not assume devices starting with `NRF-` are unrelated.
- The user tested from Android Chrome (and earlier showed an iPhone browser screenshot). Standard Safari/Chrome on iOS does not expose normal Web Bluetooth. For repeatable checks, use the **same Android phone/browser** for InkLink and XLY95.
- User's nRF Connect Mobile screenshot showed Generic Access 0x1800, Generic Attribute 0x1801, Battery 0x180F, Device Information 0x180A, 0xFEF5, custom EPD 13187b10-eba9-a3ba-044e-83d3217d9a38, 0x1F10, and 0x221F. The screenshot was taken with the app showing DISCONNECTED, but displays a discovered service list. No need to publicly store screenshots/MAC addresses.

## CRITICAL DISCOVERY — two distinct protocols

XLY95's main website and standalone `js.js` **do not use the same BLE protocol**. The initial InkLink implementation inspected the standalone `js.js`, which explains the repeated service-not-found errors when connecting to the user's `NRF-` clock. After inspecting the actual `index.html`, we found the matching service **present in the nRF Connect screenshot**.

| | Actual user's `NRF-` profile | Legacy `NRF_` profile |
| --- | --- | --- |
| Original code | XLY95 `index.html` | XLY95 `js.js` |
| EPD service | `13187b10-eba9-a3ba-044e-83d3217d9a38` | `32120001-0bf6-448a-9608-1b01a1a8f75c` |
| EPD characteristic | `4b646063-6264-f3a7-8941-e65356ea82fe` | `32120002-0bf6-448a-9608-1b01a1a8f75c` |
| Clock-control service | `00001f10-0000-1000-8000-00805f9b34fb` | Same characteristic |
| Clock-control characteristic | `00001f1f-0000-1000-8000-00805f9b34fb` | Same characteristic |
| Clock/calendar | RXTX `E1 02` + `E2` / `E1 01` + `E2` | `AE 01` / `AE 02` |
| Time setting | `DD` + local-adjusted epoch/year/month/day/weekday; then `E2` | `A3` + big-endian Unix seconds |
| Image transfer | Different frame/offset format (`03`/`04`) — **not yet implemented** | `A1` packet chunks supported in app, not hardware-validated |
| Connection support | Implemented in current source; **awaiting actual hardware test** | Implemented from source; no hardware validation |

More exact wire-level details, source references and caveats are in [BLE_PROTOCOLS.md](BLE_PROTOCOLS.md). **Never write legacy A1, A3, AE or A5 commands to the actual NRF- profile.**

## Timeline of debugging (14 October 2026)

1. Created the English-language InkLink app, uploaded it to this new public GitHub repository, set up GitHub Pages and Actions; automated protocol tests passed. App included BLE discovery, time/modes, English image preview, image upload and activity log.
2. Device initially not found in InkLink; XLY95 could find it. Broadened scanner and added browser diagnostics. User later selected `NRF-6CD319`.
3. On Android and iPhone tests, GATT was sometimes established and disconnected; added Safe connection mode, connection-stage log, separate notification/info buttons and service retry.
4. Repeated errors: `getPrimaryService NotFoundError: No Services matching UUID 32120001-...` and `getPrimaryServices: No Services found in device`. These came from querying the **wrong (legacy)** service. One separate attempt failed during `gatt.connect()` with `NetworkError: Connection Error: Connection attempt failed`. An occasional link failure does not establish a permanent device problem.
5. Tried 300 ms wait after choosing BLE device and another short wait before GATT discovery; the missing-service error persisted. Delay-only changes were not the solution.
6. Incorrectly focused on `NRF-` vs `NRF_` names as evidence of a wrong peripheral. User confirmed XLY95 itself selects `NRF-XXXXXX`. Corrected that assumption and supports both names.
7. User installed nRF Connect and provided service list showing 13187b10..., 1F10 and 221F, **not** 32120001... .
8. Inspected XLY95 `index.html` (rather than standalone `js.js`) and confirmed its `NRF-` name filter; EPD service/characteristic; RXTX service/characteristic; 2-channel connect; `DD`, `E1`, `E2` operations.
9. Added automatic profile selection in `src/app.mjs` and protocol-specific helpers in `src/protocol.mjs`, new tests, app safety guard disabling NRF- image uploads, and corrected README. GitHub Actions finished successfully with **9 protocol tests**.
10. **New first hardware SUCCESS at approximately 19:01 on 14 Oct:** user Activity Log confirmed `NRF- RXTX characteristic discovered`, `Protocol profile: NRF- EPD + RXTX (XLY95 main page)`, `EPD capabilities: write, notify`, `RXTX write capability: true`, and `BLE stage: connected and stable` after the 1.5-second idle test. In Safe mode, **no notifications and no writes were sent**. Details in [TEST_HISTORY.md](TEST_HISTORY.md), Test record G.
11. **New physical notification SUCCESS / link failure at 19:21–19:22:** after stable connection at 19:21:39, EPD `startNotifications()` returned success at 19:21:57. At 19:22:07, GATT disconnected unexpectedly **33.5 seconds after BLE selection**, about 10 seconds after subscription. Notification subscription itself is verified; actual incoming notifications, idle-timeout cause and time/mode writes are unverified. See Test record H in [TEST_HISTORY.md](TEST_HISTORY.md).
12. **New Safe-mode idle baseline at 19:30–19:31:** no notifications or commands, stable at 19:30:14, then **unexpected GATT disconnect after 57.2 seconds** at 19:31:07. Confirms the disconnect can happen WITHOUT notification subscription. A fixed timeout or cause remains unknown. See Test record I in [TEST_HISTORY.md](TEST_HISTORY.md).
13. **Cross-site XLY95 comparison at 19:37–19:38 (Test J):** original XLY95 main site on same Android Chrome selected the same NRF-6CD319 clock, discovered GATT/EPD/RXTX at 19:37:07–08, and logged disconnection at 19:38:07 (**~59 seconds after services connected**). No manual control commands during idle test. This is strong evidence that the ~1-minute disconnect is **not caused solely by InkLink**, but peripheral/Android idle cause remains a hypothesis. Source site's selected canvas indicated 400×300; that is **not** independent confirmation of panel resolution.
14. **FIRST VERIFIED CLOCK CONTROL at 19:46–19:47 (Test K):** after stable BLE, InkLink logged `RXTX TX DD 6A CF DC 13 07 EA 0A 0E 03` at 19:46:27, `RXTX TX E2` refresh and `Time sync: command completed` at 19:46:28. **User independently confirmed 'time is synced'.** GATT later unexpectedly disconnected after 51.4s from selection. Mode switching is next; image upload remains disabled.
15. **FIRST VERIFIED DISPLAY MODE CONTROL at 19:53 (Test L):** screenshot shows Calendar `RXTX TX E1 01` at 19:53:18 + `E2` and success at 19:53:20; then Clock `RXTX TX E1 02` at 19:53:38 + `E2` and success at 19:53:39. User explicitly confirmed **both modes switched on the physical clock**. All three core controls are hardware-verified. Image upload is next, cautiously.
16. **Phase 2 OFFLINE image R&D (Test M):** created `src/dash-image.mjs` and 10 new encoder/packet unit tests for the separate NRF- EPD protocol. Exact black/white/red preview palette, row-major and reverse-column encodings, 03/04 + flag + 16-bit byte offset + 240 data packets and read-only 400×300 transfer planning. Studio **Inspect encoded packets (offline)** runs without BLE. Existing 9 + new 10 = 19 CI tests. **No NRF- image data has been written to the clock**.
17. **Phase 2 BROWSER CHECK SUCCEEDED ~20:34 (Test N):** user screenshot confirms offline inspector in Android Chrome reports 400×300, 126 packets, 15,000-byte BW and red planes, 30,504 framed bytes, max 244-byte write, initial header 03 FF 00 00 and final red header 03 00 3A 20, EPD refresh 01, and **no Bluetooth transmission**. This verifies browser execution and accounting, NOT actual panel geometry/MTU/image rendering.

See [TEST_HISTORY.md](TEST_HISTORY.md) for more precise evidence and how to interpret old logs.

## What the app currently does (implemented, not all hardware-verified)

- Static GitHub Pages build: `index.html`, `src/styles.css`, `src/app.mjs`, `src/protocol.mjs`. Runs in a Web Bluetooth-capable HTTPS browser.
- Browser device picker defaults to names beginning `NRF-` or `NRF_`; optional broad scan.
- Auto-selects **dash** profile for `NRF-` and **legacy** profile for `NRF_`, requests the appropriate optional services, and discovers matching characteristics.
- **Safe connection** checkbox checked by default, with no automatic commands. Explicit Enable notifications; info/A9 request only in legacy profile.
- Logs GATT stages, service/characteristic discovery and write errors; reconnect/discovery troubleshooting.
- Correct `NRF-` time sync on RXTX (DD + E2) and built-in clock/calendar modes (E1 02 or E1 01 then E2) are coded and tested by unit tests, **not yet tested against physical clock**.
- English screen preview and PNG export. Legacy image transfer remains behind legacy profile. **NRF- image upload intentionally blocked** until its distinct image framing is implemented.
- Unit tests use `node --test tests/protocol.test.mjs`; GitHub Actions also checks JS syntax and deploys to Pages after tests.

## CURRENT MILESTONE AND EXACT NEXT ENGINEERING CHECKPOINT

**P0 physically complete:** working EPD/RXTX connection, notification subscription, DD/E2 time sync, E1 01/E2 Calendar and E1 02/E2 Clock mode, verified by user on 14 Oct 2026. Similar ~one-minute BLE idle disconnections observed on InkLink and original XLY95 (underlying cause unknown).

**P1 Phase 2 implemented OFFLINE ONLY:**
- New [`src/dash-image.mjs`](../src/dash-image.mjs) reproduces XLY95 black/white and positive red bitplanes, distinct reverse-column orientation on 296/212/250 presets and 03/04 + flag + BE offset + up-to-240-byte image chunks.
- The preview palette is now **pure opaque black, white, saturated red**, not the old dark blue/muted red which upstream encoder would misclassify.
- New [`tests/dash-image.test.mjs`](../tests/dash-image.test.mjs) contains 10 offline tests, bringing the automated protocol test count to **19**; CI covers new module syntax.
- Display Designer has **Inspect encoded packets (offline)** with an image/packet report. It does **not** transmit, require BLE, or enable NRF- image writes.

**Browser validation PASSED (Test N):** the user ran **Inspect encoded packets (offline)** in Android Chrome with the 400×300 XLY95 preset and saw two 15,000-byte planes, **126 packets**, **30,504 framed characteristic bytes**, largest write **244 bytes**, refresh `01`; no Bluetooth was used. **This is not independent confirmation of the actual clock panel resolution or ability to write 244 bytes.**

**IMMEDIATE NEXT TEST — nRF Connect MTU:** Disconnect InkLink/XLY95 and connect nRF Connect Android to the same NRF- clock, open the device ⋮ menu → **Request MTU** → enter **247**, then read the **actual negotiated MTU** in the connection log; share result without MAC/serial. A 244-byte acknowledged characteristic value requires ATT MTU ≥247 (`ATT_MTU − 3` Bluetooth requirement). nRF Connect and Chrome negotiate separate sessions, so even a successful nRF value does **not** prove the Chrome connection will support the same write. Independently identify the panel/model and confirm image-mode refresh/restore, ~1-minute transfer feasibility, and independent vectors. Keep **NRF- Send to clock disabled** until user-approved supervised test.

**Verified physically:** Time, Calendar and Clock control. **Implemented offline only:** image bitplanes/packets. **Still unverified:** live image rendering or continuous English face, panel dimensions, BLE write size and durable image transfer.

## Remaining work, in order

P0. **DONE (physical):** Correct NRF- EPD and RXTX characteristics discovered, EPD notifications enabled. Cross-site idle comparison **done**: XLY95 also disconnected ~59s after services connected. Cause of roughly one-minute disconnections unknown; don't add speculative keepalive.
P0. **DONE (physical):** DD/E2 time sync and E1/E2 Calendar/Clock controls verified on clock (19:46–19:53). **P1 image bitplanes and offline packet encoder now implemented/tested; browser inspector and hardware geometry/MTU validation next.**
P1. **IN PROGRESS:** Offline XLY95 NRF- encoder/10 tests and **real Android Chrome packet inspector PASSED**. **NEXT:** nRF Connect MTU ≥247 capability check; identify physical panel geometry/model; validate refresh/restore and supervised transfer. Upload still disabled.
P1. Fix any UI or connection regressions found by device logs, and keep the two profiles separate.
P2. Identify exact physical display geometry, implement accurate English designs and optional display-related controls.
P3. Explore scheduling, reliable reconnects, weather/calendar data; recognize browsers need to stay open or another gateway is needed for live feeds.
P4. Consider firmware reprogramming *only as a separate hardware investigation*, not the current BLE app goal.

For task details and done-when criteria, see [ROADMAP.md](ROADMAP.md).

## How to resume in a new ChatGPT chat

Give the next assistant this repository and tell it **to read this handoff first, then BLE_PROTOCOLS.md, TEST_HISTORY.md and ROADMAP.md, and inspect the current source before editing**. Because this repository is public and the GitHub connector is connected, use the GitHub app/connector to fetch current `main` files and check Actions. Do **not** answer from the stale standalone HTML download or old chat snippets.

Suggested message to paste:

> Continue my InkLink Clock Studio project at https://github.com/LioncityDownUnder/inklink-clock-studio . Read docs/PROJECT_HANDOFF.md, docs/BLE_PROTOCOLS.md, docs/TEST_HISTORY.md, docs/ROADMAP.md and AGENTS.md from the current main branch before making changes. We have an NRF- e-paper desk clock; the old 32120001 protocol was wrong for this model. The correct XLY95 index.html protocol (13187b10 EPD service + 1F10 RXTX service) connects to the physical clock. Notifications enabled at 19:21:57. Idle GATT sessions disconnected in InkLink (33.5s / 57.2s) and original XLY95 (~59s after EPD/RXTX discovery). Core control milestone complete: physical clock time sync (DD/E2), Calendar switch (E1 01/E2), and Clock restore (E1 02/E2) all confirmed by user on 14 Oct 2026. Next: offline NRF- packet inspector already passed in Android Chrome (126 packets/30,504 bytes for 400×300 preset). Determine actual display model and nRF Connect negotiated ATT MTU after requesting 247, then validate Chrome transport and refresh/restore before supervised image upload. Upload remains disabled. Update GitHub docs with results.

## Rules for future project updates

1. Check current `main` before changes; never blindly overwrite user commits.
2. Make code changes only after identifying whether they apply to `NRF-`, `NRF_`, or both.
3. Always label claims as **confirmed on device**, **confirmed from source**, **automated-tested only**, or **hypothesis**.
4. After each meaningful test or code update: add dated evidence to `TEST_HISTORY.md`; update current status/next action here; adjust `ROADMAP.md` and protocol doc if the knowledge changed; check Actions.
5. No firmware erase, unverified write commands, or image upload on unvalidated NRF- framing.
6. Avoid committing phone MAC address, account identifiers, BLE device keys, or private screenshots to this public repo. The device's displayed name is included only for continuity.
