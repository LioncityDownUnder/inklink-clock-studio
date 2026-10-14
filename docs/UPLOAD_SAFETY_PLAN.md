# NRF- first image upload: preflight and failure recovery

**Status:** Proposed procedure only, **not yet approved or executed** (14 October 2026). The NRF- image-upload action remains disabled. No test payloads have been transmitted.

## What has been verified

- Actual clock accepts RXTX time sync DD/E2, Calendar E1 01/E2 and Clock E1 02/E2. Built-in Clock mode provides a **verified normal-mode command**, but is **NOT verified as a cure for a half-written EPD buffer**.
- XLY95 main-page uploads BW plane followed by red (where supported), writes each EPD chunk via `writeValueWithResponse`, pauses 300 ms, then sends EPD refresh `01` (full) or `AA` (partial).
- Browser offline packet planner (400x300 preset) produces 126 packets, 30,504 total transmitted bytes including headers, maximum packet 244 bytes.
- Browser sequence preflight and timing simulation passed on Android Chrome. Actual speed and radio stability are not measured.
- nRF Connect reported MTU 512 in **a different connection**, but Chrome Web Bluetooth does not expose its negotiated ATT MTU or a proof of 244-byte write acceptance without a write.
- The original XLY95 and InkLink both show disconnects near one minute. nRF Connect logged GATT supervision timeout 0x08.

## Abort conditions (before upload is allowed)

- Unknown actual panel/controller/plane mapping, unsupported or uncertain image resolution.
- Chrome characteristic lacks acknowledged-write support.
- Transfer cannot be performed as a single source-verified, ordered EPD image operation.
- Any interrupted packet write, disconnect, browser visibility/sleep issue, or unexpected notification/error.
- No workable means of restoring clock mode or verifying the panel afterward.

## Conservative response to interruption (proposed, not device-verified)

1. **STOP ALL EPD writes immediately** when any packet write fails/disconnects. Never issue the final EPD refresh after an incomplete frame.
2. Do not resume at an arbitrary byte offset or attempt firmware erase/reset. Original XLY95 does not document safe resume/rollback of partial buffers.
3. After reconnecting in Safe mode, check whether the normal clock is still functioning. Record any display state/error before intervening.
4. If the normal clock is disrupted, the already tested **RXTX Clock mode E1 02 then E2** may be attempted with user approval as a *mode restoration*, but is **not a proven rollback of EPD memory**.
5. If Clock mode fails, **stop**. Do not send further speculative EPD commands. Capture log and seek device documentation/hardware-specific guidance.
6. Never automatically repeat the full transfer in a reconnect handler.

## Conditions for a first supervised physical test

- Explicit request/approval from user **after** reviewing risk: panel may temporarily show incomplete image, need recovery/reboot, or require hardware repair if unexpected firmware behavior exists.
- Confirm exact panel profile (400×300 likely from 84×62mm measured active area; not proven by controller ID).
- Confirm a known-good fallback procedure on this firmware as far as can be safely established.
- Keep power stable; Chrome awake in foreground; no other BLE apps/tabs connected.
- Build transparent manual progress log, estimate data volume and time, and implement a cancellation/abort path before any upload button is enabled.
- Prefer reproducing known XLY95 transfer with independently checked byte vectors. The 244-byte write limit cannot be conclusively checked without an actual write.
- Record each observable outcome; if not successful, keep NRF- upload disabled.

## Current next task

Have the user connect in Android Chrome and click **Inspect connected EPD capability — no writes**. This will establish whether acknowledged-write capability is exposed; it cannot establish real write-length support. From there design a gated, user-confirmed hardware experiment if desired, with the above safeguards.

References: [Project Handoff](PROJECT_HANDOFF.md), [BLE Protocols](BLE_PROTOCOLS.md), [Testing History](TEST_HISTORY.md).
