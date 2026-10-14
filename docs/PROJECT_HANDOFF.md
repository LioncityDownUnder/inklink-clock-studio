# Project handoff — InkLink Clock Studio

> **Canonical handoff / single starting point for future chats and contributors**
>
> **Last consolidated:** 14 October 2026 (Australia/Sydney).
>
> **Status:** GitHub Pages deployed, automated tests passing; **NRF- EPD+RXTX two-service discovery physically confirmed** at 19:01 on 14 Oct 2026. **EPD notifications physically enabled successfully** at 19:21:57. However, a later session **unexpectedly disconnected after 33.5 seconds from selection** (at 19:22:07), about 10 seconds after enabling notifications. This does not establish the cause of the disconnect. Incoming notification payloads and DD/E2 time sync or mode changes remain unverified.
>
> **Next action:** Run a **60-second Safe-mode idle baseline with NO notifications or writes**, Android Chrome foreground, XLY95 and nRF Connect disconnected. Report whether it disconnects at roughly 30–35 seconds or remains connected 60+ seconds, then compare to the 33.5-second notification-enabled session. Do not add speculative keepalive or enable NRF- image transfer.

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
- Current application files: [../src/app.mjs](../src/app.mjs), [../src/protocol.mjs](../src/protocol.mjs), [../index.html](../index.html)
- Automated tests: [../tests/protocol.test.mjs](../tests/protocol.test.mjs)
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

## EXACT next test / acceptance checkpoint

**PHYSICAL RESULTS:** EPD and RXTX services/characteristics discovered in Android Chrome (~19:01). In a later connection, EPD notification subscription succeeded (19:21:57), but there was an unexpected GATT disconnect at 19:22:07, **33.5 seconds after device selection**, ~10 seconds following notifications. The reason is **unknown**, and no actual notification payload has been confirmed. This must not be described as fully stable BLE operation.

**Next experiment (one variable at a time):**

1. Close XLY95 and nRF Connect BLE sessions. Open InkLink in Android Chrome, foreground, phone awake.
2. Connect to `NRF-` device with **Safe connection** checked. **Do not enable notifications, sync time, or press any other controls.**
3. Observe for **60 seconds**. Capture the Activity Log if it disconnects, including `Unexpected GATT disconnect after ...`, or report still connected at 60 seconds.
4. Compare with prior **33.5s** notification-enabled session; only then decide whether testing notifications again, comparison in XLY95, or more detailed Android BLE logs is warranted.
5. Do not introduce a periodic BLE keepalive until tests indicate what the clock expects. The XLY95 main page's once-per-second timer changes its **on-page text**, not the BLE clock.
6. Once stable enough, test DD/E2 time sync once and visually verify physical local time, then test modes separately. **NRF- image uploads remain disabled**.

**Verified milestones:** service discovery and notification subscription. **Pending:** idle connection reliability, notification payload reception, DD/E2 effect, E1/E2 mode effect, safe image protocol.

## Remaining work, in order

P0. **DONE (physical):** Correct NRF- EPD and RXTX characteristics discovered; EPD notifications enabled successfully at 19:21:57. **OPEN ISSUE:** unexpected disconnect after 33.5 seconds; 60-second Safe-mode/no-notification comparison pending.
P0. **NEXT:** Establish baseline BLE idle-disconnection behaviour without notifications. Once sufficiently stable, verify physical DD/E2 time and E1/E2 mode writes, one at a time.
P1. Implement `NRF-` image upload using upstream page's EPD framing, plane conversions and its supported display dimensions; add offline unit tests / byte-for-byte references before using hardware. Keep uploads disabled until validated.
P1. Fix any UI or connection regressions found by device logs, and keep the two profiles separate.
P2. Identify exact physical display geometry, implement accurate English designs and optional display-related controls.
P3. Explore scheduling, reliable reconnects, weather/calendar data; recognize browsers need to stay open or another gateway is needed for live feeds.
P4. Consider firmware reprogramming *only as a separate hardware investigation*, not the current BLE app goal.

For task details and done-when criteria, see [ROADMAP.md](ROADMAP.md).

## How to resume in a new ChatGPT chat

Give the next assistant this repository and tell it **to read this handoff first, then BLE_PROTOCOLS.md, TEST_HISTORY.md and ROADMAP.md, and inspect the current source before editing**. Because this repository is public and the GitHub connector is connected, use the GitHub app/connector to fetch current `main` files and check Actions. Do **not** answer from the stale standalone HTML download or old chat snippets.

Suggested message to paste:

> Continue my InkLink Clock Studio project at https://github.com/LioncityDownUnder/inklink-clock-studio . Read docs/PROJECT_HANDOFF.md, docs/BLE_PROTOCOLS.md, docs/TEST_HISTORY.md, docs/ROADMAP.md and AGENTS.md from the current main branch before making changes. We have an NRF- e-paper desk clock; the old 32120001 protocol was wrong for this model. The correct XLY95 index.html protocol (13187b10 EPD service + 1F10 RXTX service) connects to the physical clock. Notifications enabled at 19:21:57, but the link dropped unexpectedly after 33.5s at 19:22:07. Next: run a 60s Safe-mode idle baseline *without* enabling notifications and compare; only then test clock time sync. Update GitHub docs with results.

## Rules for future project updates

1. Check current `main` before changes; never blindly overwrite user commits.
2. Make code changes only after identifying whether they apply to `NRF-`, `NRF_`, or both.
3. Always label claims as **confirmed on device**, **confirmed from source**, **automated-tested only**, or **hypothesis**.
4. After each meaningful test or code update: add dated evidence to `TEST_HISTORY.md`; update current status/next action here; adjust `ROADMAP.md` and protocol doc if the knowledge changed; check Actions.
5. No firmware erase, unverified write commands, or image upload on unvalidated NRF- framing.
6. Avoid committing phone MAC address, account identifiers, BLE device keys, or private screenshots to this public repo. The device's displayed name is included only for continuity.
