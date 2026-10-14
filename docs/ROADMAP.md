# Roadmap and next-session checklist

**Project:** InkLink Clock Studio — English BLE interface for Chinese e-paper desk clocks.

**Last reviewed:** 14 October 2026. **Priority is correctness on the actual `NRF-` hardware, not additional UI features yet.**

Legend: **DONE (code)** = implemented and source/automated-tested; **DONE (hardware)** = measured on actual clock; **PENDING** = unverified or not implemented.

## P0 — establish device connection with the corrected protocol

- **DONE (code):** detect `NRF-` vs `NRF_` names and choose their separate XLY95 implementations.
- **DONE (code):** request EPD service `13187b10...` and RXTX service `1F10` for `NRF-`, with their respective characteristics.
- **DONE (code):** Safe connection option, connection-stage log, no automatic commands in safe mode, retry discovery, explicit notifications.
- **PENDING (hardware):** both NRF- services and characteristics discover successfully, GATT remains connected for at least ten seconds.
- **PENDING (hardware):** EPD notifications successfully start without unexpected disconnect.
- **PENDING (hardware):** test whether intermittent `gatt.connect()` NetworkError recurs; compare with XLY95 on same phone.

**Next user action:** Disconnect XLY95 / nRF Connect, reload [live app](https://lioncitydownunder.github.io/inklink-clock-studio/) in Android Chrome, use **Safe connection**, connect the NRF- clock, and send **full Activity Log** through service discovery.

**Done when:** verified logs show EPD and RXTX service/characteristic discovery and the clock remains connected. Record environment and result in [TEST_HISTORY.md](TEST_HISTORY.md).

## P0 — confirm non-destructive clock controls

- **DONE (code):** NRF- DD + local-adjusted time + E2 encoding from XLY95 main index.html.
- **DONE (code):** NRF- clock `E1 02` / calendar `E1 01` + E2 with 300 ms delay.
- **DONE (code):** automated tests cover the exact packet shape and mode bytes; tests run in GitHub Actions.
- **PENDING (hardware):** clicking **Sync date & time** updates the physical clock correctly, including timezone/date.
- **PENDING (hardware):** clock/calendar mode changes work and device remains stable.
- **PENDING (hardware):** determine if notifications contain meaningful acknowledgements/response formats.

**Safety:** only try one command at a time once BLE connection works. Image upload is disabled for NRF- and should remain disabled.

**Done when:** a user confirms physical screen change after each control and logs show no persistent errors.

## P1 — implement correct NRF- image upload

- **PENDING:** map the complete original XLY95 main-page `sendBufferData()` pipeline and image preprocessing rather than copying the legacy A1 format.
- **PENDING:** determine exact screen resolution/driver and supported colour planes on this specific clock; do not infer from photograph or default 400×300.
- **PENDING:** implement `03/04 + colour flag + 2-byte frame offset + payload` packet generator with bounds checking; original `my_step=480` hex characters per chunk.
- **PENDING:** check original screen/refresh commands and the full sequence required for image mode.
- **PENDING:** add deterministic unit tests against byte-for-byte references derived from upstream and test maximum frame sizes.
- **PENDING:** with explicit user agreement, send a simple small/blank test image first only after screen dimensions and packets are confirmed.
- **PENDING:** enable `Send image` only after a confirmed physical transfer.

**Done when:** repeated image uploads to the physical clock render correctly, without breaking the built-in live clock mode; mode can be restored.

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
