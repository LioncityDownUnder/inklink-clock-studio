# InkLink Studio — English BLE E-Paper Clock App

A browser-based, English-language control panel and image designer for desk clocks compatible with the [XLY95 BLE protocol](https://github.com/XLY95/xly95.github.io). Built with plain HTML, CSS and JavaScript; no dependencies or server-side account.

> **Hardware-test beta.** Updated 14 October 2026: NRF- EPD/RXTX discovery, notification subscription and **physical clock time synchronization all succeeded**. The user's 19:46–19:47 Activity Log showed `DD` RXTX time packet + `E2` refresh and successful command completion; the user confirmed **time is synced**. The link disconnected later after 51.4s, similar to idle disconnects on both InkLink and original XLY95. **Clock/Calendar modes and NRF- image upload remain unverified.**

## Start here / continuing in a new chat

**This GitHub repository is the permanent project record.** To resume the project in any future ChatGPT chat, provide the repository URL and ask the assistant to read these files on the current `main` branch **before taking action**:

- **[Project handoff / current checkpoint](docs/PROJECT_HANDOFF.md)** — current status, hardware evidence, confirmed discoveries, next exact test and ready-to-copy continuation prompt. **Read first.**
- [BLE protocol reference](docs/BLE_PROTOCOLS.md) — both `NRF-` and `NRF_` UUIDs, characteristic channels, command bytes, image upload limits.
- [Testing history / failure log](docs/TEST_HISTORY.md) — observed screenshots and errors, what we tried, why older attempts failed, pending result template.
- [Roadmap](docs/ROADMAP.md) — current priorities, acceptance criteria and later features.
- [Instructions for AI coding assistants](AGENTS.md) — how to work safely in the repo and keep documentation updated.

**Next physical checkpoint:** clock time sync **confirmed working** on physical hardware at 19:46:28. Next test **Calendar mode** then **Clock mode** using the existing source-confirmed `E1`/`E2` RXTX commands, one step at a time. Keep NRF- image upload disabled.


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

## Next physical-device test (current checkpoint)

**Physically verified:** NRF- EPD/RXTX service and characteristic discovery; notification subscription; **RXTX DD time packet + E2 refresh successfully synchronized the clock's time** at 19:46:28 (user confirmed). Another unexpected BLE idle disconnection occurred after 51.4 seconds from selection; original XLY95 also disconnects around one minute, so don't treat this as solely an InkLink bug.

**Next experiment — built-in display modes:**

1. Close the XLY95 and nRF Connect BLE sessions. Use [InkLink](https://lioncitydownunder.github.io/inklink-clock-studio/) on Android Chrome.
2. Connect the same NRF- clock with **Safe connection** checked.
3. Within ~20 seconds of connected and stable, click **Calendar mode** once. InkLink sends RXTX `E1 01`, waits 300ms and sends `E2`. Confirm the physical screen shows the calendar and capture the Activity Log.
4. Reconnect if necessary and click **Clock mode** once; it sends `E1 02`, then `E2`. Confirm the usual clock face returns.
5. Record actual physical results in [TEST_HISTORY.md](docs/TEST_HISTORY.md). Don't infer physical success just from BLE write acknowledgement.
6. **NRF- image upload remains disabled** until the distinct EPD image transfer implementation is validated.

XLY95 previously displayed a 400×300 canvas selection; this is not independent proof of the physical panel resolution.

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
node --check src/app.mjs
node --test tests/protocol.test.mjs
```

Project layout:

```text
index.html            Main app
src/styles.css        App design
src/protocol.mjs      BLE packet encoding + image conversion
src/app.mjs           UI, canvas, Bluetooth and transfer logic
tests/                9 protocol unit tests
AGENTS.md             Instructions for coding assistants
docs/PROJECT_HANDOFF.md  Continuity + current status
docs/BLE_PROTOCOLS.md    Both BLE profiles and commands
docs/TEST_HISTORY.md     Chronological experiment log
docs/ROADMAP.md          Prioritized next steps
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
