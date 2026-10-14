# Project instructions for AI coding assistants and future ChatGPT sessions

**IMPORTANT: read [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) before working on anything in this repository.** This repository is the durable project memory for chats and coding assistants. Follow [docs/BLE_PROTOCOLS.md](docs/BLE_PROTOCOLS.md), [docs/TEST_HISTORY.md](docs/TEST_HISTORY.md), and [docs/ROADMAP.md](docs/ROADMAP.md) as needed.

## Current task and state (14 October 2026)

InkLink is an English browser BLE controller for a battery-powered Chinese e-paper desk clock. The current experimental hardware advertises `NRF-6CD319`.

**Do not repeat the old mistake:** the XLY95 project exposes **two different** device protocols:
- `NRF-` clock (actual device): original XLY95 *main index.html*; EPD service `13187b10-eba9-a3ba-044e-83d3217d9a38` plus RXTX service `00001f10-0000-1000-8000-00805f9b34fb`. Details and characteristics in [BLE_PROTOCOLS.md](docs/BLE_PROTOCOLS.md).
- `NRF_` legacy: original separate `js.js`; service `32120001-0bf6-448a-9608-1b01a1a8f75c`. Its commands and image framing differ.

The latest code implements both profiles and passes 9 unit tests and JS syntax checks in GitHub Actions. **Physical connection with the corrected NRF- profile IS NOW CONFIRMED:** user-provided Android Chrome Activity Log at approximately 19:01 on 14 Oct 2026 shows EPD and RXTX characteristics discovered, correct NRF- profile, EPD write/notify and RXTX write supported, and the initial 1.5-second idle test passed in Safe mode. **Not yet verified:** 10+ seconds stability, notifications, physical time sync or mode changes. Next step: enable notifications in a stable Android Chrome connection; then time sync once and visually confirm.

## Read before editing

- `README.md` — public project overview and deployment instructions.
- `docs/PROJECT_HANDOFF.md` — chronological background, known facts, resume prompt, next test.
- `docs/BLE_PROTOCOLS.md` — profile-specific services/characteristics and write commands, safety limits.
- `docs/TEST_HISTORY.md` — observed failures/experiments and next result template.
- `docs/ROADMAP.md` — priority, acceptance criteria and future work.
- `src/app.mjs` — BLE discovery, connection lifecycle, UI and controls.
- `src/protocol.mjs` — protocol constants/encoders and legacy image bit packing.
- `tests/protocol.test.mjs` — unit tests (currently 9).
- `.github/workflows/deploy.yml` — automated tests and GitHub Pages publishing.

## Working and deployment approach

- Repo: https://github.com/LioncityDownUnder/inklink-clock-studio
- Live: https://lioncitydownunder.github.io/inklink-clock-studio/
- Primary branch: `main`. Before writing, fetch existing files/current SHAs through the GitHub connector and avoid overwriting newer edits.
- App is static HTML, CSS and ES modules; no backend. Hosted over HTTPS for Web Bluetooth.
- Test locally: `node --check src/app.mjs && node --check src/protocol.mjs && node --test tests/protocol.test.mjs`.
- GitHub Actions runs checks then deploys Pages; check the actual workflow status after pushing.
- Do not commit MAC addresses, account details, hidden secrets or private screenshots.

## Implementation / safety rules

1. Select and keep separate the `NRF-` and `NRF_` BLE profiles. Do not send legacy `A1`, `A3`, `AE`, `A5` commands to the user's `NRF-` clock.
2. **Image upload for NRF- is deliberately disabled** because the main XLY95 site's `03/04` offset-based packet format and pixel conversion still need implementation/validation. Keep disabled until tests and a supervised hardware trial pass.
3. Prefer read-only service discovery and Safe connection before any writes; never flash, reset, erase firmware or send speculative commands.
4. Treat the nRF Connect screenshot as a device service inventory (13187b10, 1F10, 221F). It was taken showing DISCONNECTED; exact characteristics come from upstream source.
5. Distinguish **confirmed on physical hardware**, **confirmed from upstream source**, **automated-tested**, **untested hypothesis**.
6. When user returns with Activity Logs, append concrete observations to `docs/TEST_HISTORY.md`, update `docs/PROJECT_HANDOFF.md` current status and next actions, revise roadmap/protocol doc if needed, and add tests for code changes.
7. Don't blindly assume the old standalone `InkLink_Clock_Studio.html` download is up to date. Deployed `index.html` + `src/` are authoritative.

## First response in a new chat

When asked to continue this project, inspect the current GitHub handoff and source files, then say succinctly which hardware test remains. **Do not restart BLE discovery research, suggest buying a programmer, or treat the earlier missing `32120001` service as a new failure.** The protocol mismatch is resolved for service discovery on the actual clock; the initial corrected physical connection succeeded. What remains is longer connection stability, notification subscription and validating time/mode commands on the physical screen.
