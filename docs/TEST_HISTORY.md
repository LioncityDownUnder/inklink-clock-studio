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

## Next physical test — notifications and controlled clock writes (PENDING)

**Date/time:** TBD. **Browser:** Android Chrome. **Hardware:** same NRF- desk clock. Initial connection success already observed in Test record G; do not reclassify it as untested.

1. If still connected, observe the connection remains stable for 10–15 seconds; otherwise reconnect in Safe mode. Do not open XLY95 or nRF Connect simultaneously.
2. Press **1. Enable notifications** and wait several seconds. Capture success/error log.
3. If still connected, press **Sync date & time** once and verify the actual screen's local time/date. The app sends DD payload and E2 on RXTX.
4. Optionally test the built-in **Clock mode** and **Calendar mode** buttons one at a time, checking the actual display.
5. Record any new errors and the verified device changes below; do not upload an image (unsupported for NRF-).

### Outcome template for future sessions

Copy and fill this in when the user reports results:

| Field | Result |
| --- | --- |
| Date / build commit | 2026-10-14, corrected dual-profile build, latest specific source commit TBD |
| Browser / OS | Android Chrome / exact version if known |
| Device advertised name | NRF-... |
| XLY95 works in same browser? | Yes / No / not tested |
| BLE picker found device? | **Yes (verified at 19:01)** |
| `gatt.connect()` success? | **Yes (verified at 19:01)** |
| EPD service/characteristic found? | **Yes (verified at 19:01)** |
| RXTX service/characteristic found? | **Yes (verified at 19:01)** |
| Notifications work? | Yes / No / not tested |
| Time sync affects screen? | Yes / No / not tested |
| Mode controls affect screen? | Yes / No / not tested |
| Actual error/log excerpt | TBD |
| Next engineering action | TBD |

**Change history discipline:** append only verified new evidence, mark hypotheses accordingly, and update [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) current status and [ROADMAP.md](ROADMAP.md) accordingly.
