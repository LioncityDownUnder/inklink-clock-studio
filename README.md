# InkLink Studio — English BLE E-Paper Clock App

A browser-based, English-language control panel and image designer for desk clocks compatible with the [XLY95 BLE protocol](https://github.com/XLY95/xly95.github.io). Built with plain HTML, CSS and JavaScript; no dependencies or server-side account.

> **Version 1 / hardware-test beta.** The packet format was inspected in XLY95's publicly accessible JavaScript on 14 October 2026. The application has been tested in Chromium with a simulated BLE device and Node unit tests, **not yet with the photographed clock itself**.

## Features

- Pair with Bluetooth devices named `NRF_...`, or select "Show all nearby devices" if required.
- Query device information / collect notifications (decoded as hex, raw data only).
- Set time from the browser's clock.
- Switch between built-in clock mode (`AE 01`) and calendar mode (`AE 02`).
- Preview custom English clock faces, message boards, or imported images.
- Black/white and black/white/red e-paper conversion; ordered dithering for photos.
- Export the current design as a PNG.
- Transfer pixels to the clock over BLE with progress feedback and adjustable write sizes.
- Local operation: images, commands and clock interactions remain on the device/browser (no network API calls).

## Easiest way to start

**Option A — Standalone HTML**

Open `InkLink_Clock_Studio.html` in **Chrome or Edge on desktop**. This self-contained file has the same UI, styles and functionality, without separate files. Bluetooth requires a *secure context*; modern Chrome normally treats local files as potentially trustworthy, but the most reliable approach is to host it over HTTPS or localhost.

**Option B — Local development server**

With Python 3:

```bash
cd english-eink-clock
python -m http.server 8000
```

Open `http://localhost:8000` in desktop Chrome/Edge. All program assets are local. No npm install needed.

**Option C — GitHub Pages**

1. Create a repository in your GitHub account (e.g., `english-eink-clock`).
2. Upload `index.html` and the `src` directory to the repository root, preserving the structure.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)` and save.
4. Open the HTTPS address GitHub Pages provides, e.g. `https://YOUR-USERNAME.github.io/english-eink-clock/`.
5. Use Chrome/Edge to connect. Device pairing requires a click and browser permission every time it is requested.

## Browser compatibility

- **Chrome or Edge (desktop):** best supported.
- **Chrome (Android):** supported on compatible devices.
- **Safari and Chrome (iOS/iPadOS):** standard browsers do not support Web Bluetooth, so use a desktop or Android device for BLE. You can still edit and export artwork on iPhone.
- **GitHub Pages/HTTPS or `localhost`:** required for web-based Bluetooth. Using the standalone local HTML file may work in compatible Chromium browsers.

## First physical-device test

1. On the original [XLY95 website](https://xly95.github.io/), check which **display driver/resolution** is selected for the clock. The photographed desk clock looks close to 4.2 inches, but **400 × 300 is only a guess**.
2. Disconnect the original XLY95 site before attempting to connect here.
3. Open InkLink Studio → **Connect clock** → select the `NRF_...` device.
4. Try **Sync date & time**; check the clock's display for correct local time.
5. Try **Clock mode** / **Calendar mode**.
6. Open **Display studio**, verify screen dimensions and colour mode, and start with a small trial using the safest `20 byte` write size.
7. Once uploaded, the e-paper display may take additional seconds to refresh. If the image appears distorted or fails, do **not** keep sending repeated transfers; confirm model resolution and protocol version first.

**Important:** An image upload is a **static bitmap**. It does not update itself each minute. Switch back to **Clock mode** to resume the firmware's built-in live clock. Automatic custom English clock faces require additional support, such as periodic BLE refresh with a connected browser or modified device firmware.

## Protocol summary

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

First B/W image packet uses flag `0F`; subsequent B/W packets `FF`. First red-plane packet uses `00`; subsequent red packets `F0`. In black/white plane, pixel bit `1` means white, `0` means black. In the red plane, `0` means a red pixel, `1` means not red. Pack MSB first, row by row. For tri-colour images, black/white data is sent first and red data second. The full characteristic packet must fit within the negotiated BLE write length. Default is the conservative 20 bytes.

The source site uses a mixture of writes with and without response during image transfer. This app replicates that transfer strategy, with a brief delay for unacknowledged writes. For greater reliability choose **Every packet — reliable / slow**. Receiving an acknowledged GATT write does not prove the e-ink panel was successfully refreshed.

## Development/tests

Tests need Node.js 18+ (no installation of dependencies):

```bash
node --test tests/protocol.test.mjs
```

Project layout:

```text
index.html            Main app
src/styles.css        App design
src/protocol.mjs      BLE packet encoding + image conversion
src/app.mjs           UI, canvas, Bluetooth and transfer logic
tests/                Unit tests
README.md             This document
```

## Limitations and safety

- Not a firmware flasher. It does not erase or update MCU flash.
- Screen dimensions, hardware drivers and red-plane mapping may differ between models. Confirm on original XLY95 site before uploading.
- Device notifications are displayed as raw hexadecimal; the response format has not been reverse engineered.
- Packet size larger than 20 bytes requires support by the browser/device connection. If uploads fail, reduce packet size to 20 and use acknowledged writes.
- Web Bluetooth may be blocked by corporate browser policy, OS permissions or an existing BLE pairing/connection.
- E-paper updates consume power and take time; avoid repeated fast refreshes. The app deliberately does not perform automatic image updates in v1.
- No source code from the XLY95 repository is copied here. This implementation references publicly visible command formats and is not affiliated with XLY95.

## Source protocol reference

- https://xly95.github.io/
- https://github.com/XLY95/xly95.github.io/blob/main/js.js
