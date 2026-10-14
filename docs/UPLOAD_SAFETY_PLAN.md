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

## Reviewed adapter checkpoint — not activated (14 October 2026)

An isolated `src/ble-guarded-writer.mjs` now provides a fail-closed wrapper around acknowledged EPD characteristic writes. It checks: `write` characteristic capability; connected GATT link; foreground visibility; abort signal; elapsed operation deadline; serialized writes; and the same conditions **after** each resolved write. A rejected write permanently blocks subsequent sends. There is no automatic reconnect, retry, image resume, refresh, or rollback. Eight mock tests cover these behaviours.

**Not wired to `src/app.mjs`** and cannot send clock image data in the current deployed UI. The existing `NRF-` upload control stays disabled. The wrapper is an engineering review artifact, NOT a hardware-ready feature.

**Important in-flight write limitation:** A browser `writeValueWithResponse` promise may remain pending when Bluetooth communication stalls. A local deadline/cancel request cannot force cancellation of that in-flight BLE operation; the wrapper checks safety again only if the promise resolves/rejects. An actual hardware implementation must account for unresolved promises, avoid concurrent attempts, and never issue a refresh under uncertainty. Promise timeout/race alone must not be described as cancellation.

**Unresolved prerequisites:** actual Chrome 244-byte acceptance, source-specific incomplete-image recovery (not verified), panel driver identity, and separate informed user authorization. Before enabling uploads, perform a threat/failure review for stalled pending writes, display/page backgrounding, and clock restoration—not merely passing mock tests.

## Pending-write stall warning review (14 October 2026, mock-only)

A new pure `src/pending-write-monitor.mjs` tracks a pending acknowledged write and emits a **stalled-warning** after a configurable threshold. The observer **does not cancel, reject, resolve or time out** an underlying characteristic write. It distinguishes an unresolved promise from a failed write. The mock upload UI now offers **Packet 25 stalls for 4.5 seconds (mock only)**; with a 1-second warning, the interface makes the user wait for the fake write to settle. Pressing Cancel during the stall requests cancellation but does **not** claim to have stopped the in-flight operation.

Key policy: **timeout warning ≠ cancelled Bluetooth write ≠ recovered e-paper buffer**. Never issue an EPD refresh, reconnect/retry, or another packet merely because a UI watchdog has elapsed. A future real upload would require explicit, separate informed authorization after hardware risks are reviewed; no such approval has been given.

**Final preflight review status:** controlled mock and isolated adapter tests cover packet ordering, acknowledged-write failure, cancellation at write boundaries, page visibility, deadline gating and warning-only stalled writes. Remaining unknown: true Chrome 244-byte characteristic write acceptance, device refresh and recovery from half-written frame. Clock-mode E1 02/E2 is not a proven rollback.

## Current next task

Have the user connect in Android Chrome and click **Inspect connected EPD capability — no writes**. This will establish whether acknowledged-write capability is exposed; it cannot establish real write-length support. From there design a gated, user-confirmed hardware experiment if desired, with the above safeguards.

References: [Project Handoff](PROJECT_HANDOFF.md), [BLE Protocols](BLE_PROTOCOLS.md), [Testing History](TEST_HISTORY.md).
