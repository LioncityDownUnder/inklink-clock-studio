# Project instructions for AI coding assistants and future ChatGPT sessions

## Checkpoint Y — guarded transfer implementation (NOT ACTIVE)

`src/dash-supervised-transfer.mjs` is a separable, injection-based sequential EPD image transfer engine requiring explicit consent and a passed audit; it performs acknowledged writes via a supplied callback, emits packet progress, honours AbortSignal at write boundaries, stops immediately on rejected write or lost link, never refreshes partial image, and never auto-retries/resumes/restores. Eight mocked tests bring suite to 46. **No import or invocation from `src/app.mjs` exists and `NRF-` Send Image remains disabled.** Consent to build was not permission to send an image. Next engineer a gated UI adapter and review unrecoverable-partial-buffer risk and Chrome MTU, then ask for explicit permission for a supervised on-device trial.



## Checkpoint W — Supervised image-upload rehearsal, not an upload

`src/upload-rehearsal.mjs` and `tests/upload-rehearsal.test.mjs` add a pure offline rehearsal/checklist, exposed as **Prepare dry-run upload checklist** in Display Designer. This only assembles source-grounded procedural steps and never transmits data. Four new tests (38 total). **Do not enable the physical NRF- upload button, send dummy packets, or claim the first upload has occurred.** Need separate user approval and improved recovery confidence first.



## Chrome read-only EPD capability inspection checkpoint

`src/ble-capabilities.mjs` and its four tests provide a zero-write browser-side BLE inspection of the connected NRF- EPD characteristic; Display Designer has an **Inspect connected EPD capability — no writes** button. This confirms characteristic properties/method exposure but **cannot** verify a numerical MTU or successful 244-byte writes. Do not introduce dummy/probing BLE packets or enable NRF- image writes without a deliberate user-approved supervised image test and interruption recovery plan.



## Phase 2 preflight audit (14 Oct 2026)

XLY95 main-page `upload_image()` sends EPD BW packets then red packets via `writeValueWithResponse`, waits 300 ms, then sends EPD `01` or `AA` refresh by acknowledged write. It supplies no verified mid-frame resume/rollback. New `src/dash-preflight.mjs` validates packet plane order, offsets, bytes, assumed MTU-3 capacity and final opcode **offline only**, with five tests; simulation UI reports audit outcome. Existing time/mode RXTX controls must not be conflated with image EPD writes. Do NOT enable NRF- physical image upload or create probing writes until browser write-capacity and safe restoration are addressed.



## Current simulator milestone (14 October 2026)

`src/dash-simulator.mjs` is a **pure, no-BLE** NRF- image-transfer simulator. User-facing Display Designer controls adjust assumed ATT MTU, per-packet latency and connection lifetime and report expected completion, image-vs-refresh interruption and unsafe restart caveats. Six new tests in `tests/dash-simulator.test.mjs`; suite intended total 25. 29.2 seconds for the 400×300 default is **hypothetical** (126×200ms + assumed 4s refresh), not observed throughput. The real NRF- image upload remains disabled. Continue with Android Chrome browser simulator validation and research into write size, refresh sequence and incomplete-frame recovery before supervised physical tests.



**IMPORTANT: read [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) before working on anything in this repository.** This repository is the durable project memory for chats and coding assistants. Follow [docs/BLE_PROTOCOLS.md](docs/BLE_PROTOCOLS.md), [docs/TEST_HISTORY.md](docs/TEST_HISTORY.md), and [docs/ROADMAP.md](docs/ROADMAP.md) as needed.

## Current task and state (14 October 2026)

InkLink is an English browser BLE controller for a battery-powered Chinese e-paper desk clock. The current experimental hardware advertises `NRF-6CD319`.

**Do not repeat the old mistake:** the XLY95 project exposes **two different** device protocols:
- `NRF-` clock (actual device): original XLY95 *main index.html*; EPD service `13187b10-eba9-a3ba-044e-83d3217d9a38` plus RXTX service `00001f10-0000-1000-8000-00805f9b34fb`. Details and characteristics in [BLE_PROTOCOLS.md](docs/BLE_PROTOCOLS.md).
- `NRF_` legacy: original separate `js.js`; service `32120001-0bf6-448a-9608-1b01a1a8f75c`. Its commands and image framing differ.

The latest code implements both profiles and passes **19 unit tests** (9 original + 10 new offline NRF- image tests) and JS syntax checks in GitHub Actions. **Physical connection with the corrected NRF- profile IS CONFIRMED:** user-provided Android Chrome Activity Log at approximately 19:01 on 14 Oct 2026 shows EPD and RXTX characteristics discovered, correct NRF- profile, EPD write/notify and RXTX write supported. **Notification subscription is also CONFIRMED:** `startNotifications()` succeeded at 19:21:57 during a later real-hardware session. **CORE NRF- CLOCK CONTROL MILESTONE COMPLETE (physically confirmed on 14 Oct 2026):** Time sync `DD 6A CF DC 13 07 EA 0A 0E 03` + `E2` worked at ~19:46; Calendar `E1 01` + `E2` physically switched display at 19:53:20; Clock `E1 02` + `E2` physically restored clock at 19:53:39. All were explicitly confirmed by user. Services and notification subscription also previously succeeded. **PHASE 2 IN PROGRESS:** new `src/dash-image.mjs` offline NRF- positive-red/BW encoder and 03/04 offset packet planner, exact RGB preview quantizer, Display Designer `Inspect encoded packets (offline)` button and `tests/dash-image.test.mjs` (10 new cases) are committed. No BLE image packets are sent. Next: check inspector in Android Chrome; confirm physical panel dimensions, image mode/refresh/restore, MTU/244-byte write support and transfer duration before any supervised physical upload. Keep NRF- uploads disabled. BLE occasionally disconnects after ~1 minute on InkLink and original XLY95; root cause unknown, don't add speculative keepalives. Incoming notification payloads, physical time sync and mode effects remain unverified.

## Offline e-paper transfer milestone (14 October 2026)

- The original XLY95 `index.html` image encoding differs from the legacy A1 transfers. Source-derived NRF- pure black/white/positive-red pixel conversion and size-specific orientation are in `src/dash-image.mjs`.
- `createDashTransferPlan()` generates packets and refresh-code metadata only; no Bluetooth calls. The app's Inspector provides a readable plan. The actual `uploadImage()` handler must continue rejecting `state.profile === 'dash'`.
- Ten new tests in `tests/dash-image.test.mjs`, 19 total unit tests. Workflow checks this module and runs `node --test tests/*.test.mjs`.
- Inferred 400×300 packet plan: 126 chunks, 30,504 transmitted bytes with up to 244 bytes/packet. **400×300 has not been confirmed on the physical panel; 244-byte GATT write support is unknown**. Avoid assuming default canvas is the real display.
- **Browser test DONE:** user ran offline inspector on Android Chrome ~20:34 14 Oct 2026; report showed 400×300 selected preset, 126 packets, two 15,000-byte planes, 30,504 framed bytes, max 244-byte write, refresh 01; no BLE transmission. **Next safe check:** nRF Connect on same Android phone → connect clock → device ⋮ → Request MTU 247 → read negotiated MTU from log. A 244-byte acknowledged characteristic Write Request requires ATT MTU ≥247; nRF Connect negotiation does NOT prove the separate Chrome session supports the same size. Also independently identify physical panel geometry/model.

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

When asked to continue this project, inspect the current GitHub handoff and source files, then say succinctly which hardware test remains. **Do not restart BLE discovery research, suggest buying a programmer, or treat the earlier missing `32120001` service as a new failure.** The protocol mismatch is resolved for service discovery on the actual clock; the initial corrected physical connection succeeded. Core physical NRF- controls are confirmed (DD/E2 time, E1 01/E2 calendar, E1 02/E2 clock). Phase 2 offline image encoder and packet inspector have been committed with ten new tests, 19 total. Offline packet inspector already passed on Android Chrome. Next obtain read-only nRF Connect negotiated MTU after requesting 247, confirm actual physical panel/model, and verify safe image refresh/restore. Physical NRF- Send Image remains disabled; do not send A1 legacy chunks or speculative image packets.
