# Testing and investigation history

**Evidence log started:** 14 October 2026 (Sydney local time). This records the sequence **before** the corrected NRF- dual-service implementation was tried on real hardware. Use it to avoid repeating failed hypotheses. Each entry is a summary of user-reported screenshots/logs; screenshots themselves are not committed to a public repository.

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

**IMPORTANT HARDWARE STATUS:** None of the user's screenshots so far demonstrates that the **corrected** dual-profile InkLink has successfully connected to the physical clock. Test A–D screenshots predate the corrected service and characteristic selection. **Do not infer live success from the Actions pass.**

## Planned next test: Pending, record outcome below

**Date/time:** TBD. **Browser:** Android Chrome. **Hardware:** same NRF- desk clock.
1. Close XLY95 and nRF Connect BLE sessions, reload live InkLink.
2. Leave Safe connection checked; connect `NRF-6CD319`.
3. Capture service stages. For a successful connection, both EPD `13187b10`/`4b646063` and RXTX `1F10`/`1F1F` should be discovered and UI should remain connected for at least ten seconds.
4. Only after that, test Enable notifications, time sync and clock/calendar modes individually. Confirm *physical screen effect* instead of relying only on a successful Web Bluetooth write.
5. Record screenshot-derived log excerpts, whether XLY95 works on same phone, and result here. Do not commit private screenshots or Bluetooth MAC address.

### Outcome template for future sessions

Copy and fill this in when the user reports results:

| Field | Result |
| --- | --- |
| Date / build commit | TBD |
| Browser / OS | Android Chrome / exact version if known |
| Device advertised name | NRF-... |
| XLY95 works in same browser? | Yes / No / not tested |
| BLE picker found device? | Yes / No |
| `gatt.connect()` success? | Yes / No |
| EPD service/characteristic found? | Yes / No |
| RXTX service/characteristic found? | Yes / No |
| Notifications work? | Yes / No / not tested |
| Time sync affects screen? | Yes / No / not tested |
| Mode controls affect screen? | Yes / No / not tested |
| Actual error/log excerpt | TBD |
| Next engineering action | TBD |

**Change history discipline:** append only verified new evidence, mark hypotheses accordingly, and update [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) current status and [ROADMAP.md](ROADMAP.md) accordingly.
