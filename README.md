# InkLink Studio — English BLE E-Paper Clock App

### Supervised transfer engine — built, not activated

A separate `src/dash-supervised-transfer.mjs` implements sequential acknowledged EPD writes, per-packet progress, a 300 ms pre-refresh delay, AbortSignal cancellation between writes, disconnection/error stops and no refresh on incomplete images. Eight mocked-device tests are included (46 automated tests total). **The live web app does not invoke this transfer engine, and physical `NRF-` image uploads remain disabled**. The user approved development only, not transmitting an image. Actual Chrome 244-byte writes, recovery and supervised approval remain outstanding.



### Supervised image upload rehearsal (offline only)

Click **Prepare dry-run upload checklist** in Display Designer to build an ordered no-write checklist for the current image, audit/assumed MTU and failure-handling steps. It never connects or writes, and **does not authorize** an actual upload. Four additional unit tests bring the suite to 38 tests. The `NRF-` live Send to Clock control remains disabled until explicitly approved and the interruption recovery risks are understood. Read [Upload Safety Plan](docs/UPLOAD_SAFETY_PLAN.md).



### Read-only EPD write-capability inspection

Connect to the `NRF-` clock, then select **Inspect connected EPD capability — no writes** in Display Designer. This reads browser-side characteristic properties and method availability only; it never calls a BLE characteristic read or write. **Chrome Web Bluetooth does not provide a negotiated ATT MTU value**, so an MTU of 512 reported by nRF Connect in a separate connection does *not* guarantee Chrome can send 244-byte image packets. The physical image-upload action remains disabled.



### Offline protocol preflight (no BLE writes)

The transfer simulator also audits source-confirmed **BW → red packet order**, byte-offset continuity, assumed `ATT MTU - 3` write capacity, per-packet size and final refresh command. XLY95 sends EPD acknowledged writes, waits **300 ms** after planes, and sends EPD refresh `01` (full) or `AA` (partial). This is **not** the clock-mode RXTX `E2` command. There is no documented safe resumption of a half-written frame. `src/dash-preflight.mjs` adds five deterministic tests; total automated tests intended **30**. The physical image-upload feature remains disabled.



A browser-based, English-language control panel and image designer for desk clocks compatible with the [XLY95 BLE protocol](https://github.com/XLY95/xly95.github.io). Built with plain HTML, CSS and JavaScript; no dependencies or server-side account.

> **Hardware-tested clock controls (14 October 2026):** The real NRF- clock successfully responds to time sync (`DD` + `E2`), Calendar mode (`E1 01` + `E2`), and Clock mode (`E1 02` + `E2`). The user explicitly confirmed each on the physical device; the mode changes were logged at 19:53:20 and 19:53:39. **NRF- custom image upload is not yet implemented or device-validated**. BLE can disconnect after around a minute on both InkLink and original XLY95; the underlying cause is unproven.

## Start here / continuing in a new chat

**This GitHub repository is the permanent project record.** To resume the project in any future ChatGPT chat, provide the repository URL and ask the assistant to read these files on the current `main` branch **before taking action**:

- **[Project handoff / current checkpoint](docs/PROJECT_HANDOFF.md)** — current status, hardware evidence, confirmed discoveries, next exact test and ready-to-copy continuation prompt. **Read first.**
- [BLE protocol reference](docs/BLE_PROTOCOLS.md) — both `NRF-` and `NRF_` UUIDs, characteristic channels, command bytes, image upload limits.
- [Testing history / failure log](docs/TEST_HISTORY.md) — observed screenshots and errors, what we tried, why older attempts failed, pending result template.
- [Roadmap](docs/ROADMAP.md) — current priorities, acceptance criteria and later features.
- [Instructions for AI coding assistants](AGENTS.md) — how to work safely in the repo and keep documentation updated.

**Phase 2 status:** Android Chrome **offline packet inspection PASSED (14 October 2026 ~20:34)**: 400×300 XLY95 preset; 126 packets; BW/red 15,000 bytes each; 30,504 framed bytes; maximum 244-byte packet; refresh 01; **no Bluetooth transmission**. The offline encoder has 10 new tests (**19 total**). **Next:** independently confirm panel model/resolution and safely inspect nRF Connect's negotiated ATT MTU (request 247); Chrome's negotiated MTU is separate. **NRF- upload stays disabled.**


## Device compatibility

The public XLY95 site includes **two different BLE implementations**. InkLink now selects the profile by the device's advertised name:

| Device name | Source implementation | EPD service | Clock controls |
| --- | --- | --- | --- |
| `NRF-...` | XLY95 main `index.html` | `13187b10-eba9-a3ba-044e-83d3217d9a38` | RXTX `00001f10-0000-1000-8000-00805f9b34fb` |
| `NRF_...` | XLY95 standalone `js.js` | `32120001-0bf6-448a-9608-1b01a1a8f75c` | Same characteristic as EPD |

On `NRF-` clocks, the EPD characteristic is `4b646063-6264-f3a7-8941-e65356ea82fe` and the RXTX write characteristic is `00001f1f-0000-1000-8000-00805f9b34fb`.

The user-provided nRF Connect scan for an `NRF-6CD319` device showed both expected service UUIDs for the `NRF-` profile.

## Features and safety

- Connect in a Web Bluetooth browser with clear stage-by-stage diagnostics.
- Default safe connection: discover services without sending commands.
- Explicitly enable notifications after connection.
- Synchronise the clock and switch between built-in clock/calendar modes using profile-specific commands.
- Preview English faces, messages and custom images locally; export previews as PNG.
- Image upload using the older A1 packet protocol is supported only for the `NRF_` profile.
- **NRF- image upload is disabled** pending implementation and validation of its distinct offset-based `03/04` image packet protocol.
- No firmware flashing, unlocking, destructive commands, or background Bluetooth reconnection.

These commands are verified against publicly accessible source and automated unit tests. Real-device compatibility must still be confirmed by testing. XLY95's original source supports more commands; they should not be used on the wrong profile.

## Easiest way to start

**Option A — Open the deployed website**

Use **https://lioncitydownunder.github.io/inklink-clock-studio/** in Android Chrome or desktop Chrome/Edge. The GitHub Pages version uses the current `src/` modules. Old standalone HTML downloads are not automatically updated with this new device protocol.

**Option B — Local development server**

With Python 3:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in desktop Chrome/Edge. All program assets are local. No npm install needed.

**Option C — GitHub Pages (this repository)**

1. Open [Settings → Pages](https://github.com/LioncityDownUnder/inklink-clock-studio/settings/pages).
2. Set **Build and deployment → Source** to **GitHub Actions** (one-time repository setup).
3. The `.github/workflows/deploy.yml` workflow tests and publishes the app on each push to `main`. If the first workflow ran before Pages was enabled, visit [Actions](https://github.com/LioncityDownUnder/inklink-clock-studio/actions) and manually run **Test and deploy InkLink Studio** via **Run workflow**.
4. Once the deployment reports success, open **https://lioncitydownunder.github.io/inklink-clock-studio/** in Chrome/Edge (desktop) or compatible Chrome on Android. The URL is not live until Pages setup and deployment succeed.
5. For Bluetooth, disconnect any other app using the clock, click Connect, and accept the browser device permission prompt.

## Browser compatibility

- **Chrome or Edge (desktop):** best supported.
- **Chrome (Android):** supported on compatible devices.
- **Safari and Chrome (iOS/iPadOS):** standard browsers do not support Web Bluetooth, so use a desktop or Android device for BLE. You can still edit and export artwork on iPhone.
- **GitHub Pages/HTTPS or `localhost`:** required for web-based Bluetooth. Using the standalone local HTML file may work in compatible Chromium browsers.

## Next engineering milestone — NRF- custom image upload

**Completed on physical clock (14 October 2026):** GATT service discovery; EPD notification subscription; time sync via `DD` + `E2`; Calendar via `E1 01` + `E2`; Clock via `E1 02` + `E2`. User confirmed all three control effects; mode switching succeeded in the same BLE connection.

**Next:** trace original XLY95 `index.html`'s distinct e-paper image-conversion pipeline and `03/04` offset-frame transfer protocol. Identify the actual clock panel's pixel dimensions and red/black plane mapping, then write deterministic offline packet tests and verify the final refresh/return-to-clock sequence.

- The XLY95 screenshot showed a selected 400×300 canvas, **not independently verified hardware resolution**.
- The current A1-based upload belongs to legacy `NRF_` devices and **must not** be used with this `NRF-` clock.
- Keep NRF- **Send image disabled** until the correct protocol is implemented, tested and ready for a supervised physical trial.
- The BLE connection may time out near a minute on both InkLink and XLY95. We have not confirmed whether this is clock firmware idle behaviour, the Android stack or radio conditions.

See [Project Handoff](docs/PROJECT_HANDOFF.md), [BLE Protocols](docs/BLE_PROTOCOLS.md), [Testing History](docs/TEST_HISTORY.md) and [Roadmap](docs/ROADMAP.md).

### Offline image encoder — new in Phase 2

The Display Designer now includes **Inspect encoded packets (offline)**. It converts the selected preview to the `NRF-` black/white and positive-red planes, reports the original XLY95 03/04 packet headers, offsets, packet count and expected EPD refresh code. **No Bluetooth connection is required and no commands are sent.**

**Browser test passed:** The user's 20:34 Android Chrome screenshot shows 126 packets, 30,504 total framed bytes, max 244-byte write and EPD refresh 01 using the selected 400×300 profile. This is **offline-only**, not a hardware image upload. A 244-byte acknowledged write requires ATT MTU **at least 247**. nRF Connect can negotiate/request the MTU, but this cannot prove Chrome negotiated the same value. See [Testing History](docs/TEST_HISTORY.md) record N.

- New source: [`src/dash-image.mjs`](src/dash-image.mjs), with 7 source-derived image-size profiles, pure opaque RGB validation, row-major/reverse-column orientation, and 240-byte payload chunks plus 4-byte headers.
- Test coverage: [`tests/dash-image.test.mjs`](tests/dash-image.test.mjs) adds 10 tests to the previous 9, all run in GitHub Actions.
- InkLink's preview now uses pure black/white/red, which matches original XLY95's exact pixel tests. Previous muted red/dark-blue shades could produce incorrect wire data.
- Example for **selected 400 × 300 preset**: 15,000-byte BW and 15,000-byte red planes, **126 packets**, **30,504 BLE bytes** including headers, full packet **244 bytes**, refresh command `01` (metadata only). **This is NOT proof the actual clock is 400×300 or accepts 244-byte writes.**
- `NRF-` image uploads are **still blocked**. Independent screen/MTU/refresh/restore verification and a supervised hardware test are required first.

### Offline transfer simulator (no device write)

InkLink now has **Simulate transfer — no Bluetooth** under Display Designer. It uses the offline `NRF-` image packet plan and adjustable ATT MTU, assumed time per packet, and simulated connection lifetime. It reports projected duration and whether an interrupted transfer stops inside image data or refresh. The default 400×300 scenario at **200 ms/packet** and **4 s hypothetical refresh** takes **29.2 seconds**; neither speed nor refresh time has been measured. MTU 512 is reported by Android nRF Connect, **not independently confirmed in Chrome**. Incomplete transfers should never be resumed blindly.

New pure module `src/dash-simulator.mjs` and 6 new tests bring the suite to 25 cases. **This tool has no Bluetooth writes; `NRF-` image uploads are still disabled.**

## Legacy `NRF_` protocol summary (NOT for the user's `NRF-` clock)

**Do not use the following command table for `NRF-` devices.** The actual clock instead uses EPD service `13187b10...`, RXTX service `1F10`, and `DD`/`E1`/`E2` commands. See [BLE_PROTOCOLS.md](docs/BLE_PROTOCOLS.md) for its complete service/characteristic details.


| Item | Value |
|---|---|
| Name prefix | `NRF_` |
| Primary service | `32120001-0bf6-448a-9608-1b01a1a8f75c` |
| Characteristic | `32120002-0bf6-448a-9608-1b01a1a8f75c` |
| Query information | `A9` |
| Time sync | `A3` + four big-endian bytes of Unix timestamp |
| Clock mode | `AE 01` |
| Calendar mode | `AE 02` |
| Image data | `A1` + flag + packed byte stream |
| Refresh screen | `A5` |

First B/W image packet uses flag `0F`; subsequent B/W packets `FF`. First red-plane packet uses `00`; subsequent red packets `F0`. In black/white plane, pixel bit `1` means white, `0` means black. In the red plane, `0` means a red pixel, `1` means not red. Pack MSB first, row by row. For tri-colour images, black/white data is sent first and red data second. On legacy `NRF_` devices, the full characteristic packet must fit within the negotiated BLE write length. Default is the conservative 20 bytes.

The source site uses a mixture of writes with and without response during image transfer. This app replicates that transfer strategy, with a brief delay for unacknowledged writes. For greater reliability choose **Every packet — reliable / slow**. Receiving an acknowledged GATT write does not prove the e-ink panel was successfully refreshed.

## Development/tests

Tests need Node.js 18+ (no installation of dependencies); these test packet encoders, not a physical BLE connection:

```bash
node --check src/protocol.mjs
node --check src/dash-image.mjs
node --check src/app.mjs
node --test tests/*.test.mjs
```

Project layout:

```text
index.html            Main app
src/styles.css        App design
src/protocol.mjs      BLE packet encoding + image conversion
src/app.mjs           UI, canvas, Bluetooth and transfer logic
tests/                19 protocol unit tests (legacy + NRF- image)
AGENTS.md             Instructions for coding assistants
docs/PROJECT_HANDOFF.md  Continuity + current status
docs/BLE_PROTOCOLS.md    Both BLE profiles and commands
docs/TEST_HISTORY.md     Chronological experiment log
docs/ROADMAP.md          Prioritized next steps
src/dash-image.mjs    Offline-only NRF- encoder and packet planner
README.md             Project overview
```

## Limitations and safety

- Not a firmware flasher. It does not erase or update MCU flash.
- Screen dimensions, hardware drivers and red-plane mapping may differ between models. The user's actual `NRF-` display geometry has not been verified; uploading images to that profile is disabled.
- Device notifications are displayed as raw hexadecimal; the response format has not been reverse engineered.
- For legacy `NRF_` image transfer, packet size larger than 20 bytes requires support by browser/device. If legacy uploads fail, reduce to 20 and use acknowledged writes. Do not apply this legacy image protocol to `NRF-`.
- Web Bluetooth may be blocked by corporate browser policy, OS permissions or an existing BLE pairing/connection.
- E-paper updates consume power and take time; avoid repeated fast refreshes. The app deliberately does not perform automatic image updates in v1.
- No source code from the XLY95 repository is copied here. This implementation references publicly visible command formats and is not affiliated with XLY95.

## Source protocol reference

- https://xly95.github.io/
- https://github.com/XLY95/xly95.github.io/blob/main/index.html (NRF-)
- https://github.com/XLY95/xly95.github.io/blob/main/js.js (NRF_)
