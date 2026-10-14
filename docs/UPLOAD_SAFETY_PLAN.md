# NRF- first image upload: preflight and failure recovery

## User decision and trial status — 14 October 2026

User accepted the described risks to **prepare** a supervised first image upload, explicitly *not* to initiate data transmission now. The new `src/first-trial-readiness.mjs` produces an on-screen list of verified and unverified gates; the Studio button only reports the gates and makes zero BLE calls. Four new tests enforce `physicalUploadEnabled:false` and `approvedToSendNow:false`, even if every gate is satisfied.

**No physical upload was performed or authorized for immediate execution.** Do not interpret mock checkbox consent as real-device consent. Before any separately confirmed transmission, surface unresolved Chrome 244-byte write compatibility and unproven interrupted buffer recovery, confirm a complete known-good image and maintain manual abort/no-blind-resume behavior.


**Status:** Proposed procedure only, **not yet approved or executed** (14 October 2026). The NRF- image-upload action remains disabled. No test payloads have been transmitted.

## Trial enablement update (14 October 2026)

User approved preparing and offering a first live supervised image-transfer attempt. The app now has a separate user-confirmed one-attempt flow that is not started automatically. It requires the connected NRF- clock, a 400×300 validated offline plan, a risk checkbox, typed `UPLOAD`, and a final confirmation. The guarded adapter checks connection, foreground visibility, cancellation and a 48-second scheduling budget; it never automatically retries or resumes. An in-flight write cannot be force-cancelled. Acknowledged refresh is not proof of a correctly updated display. **No physical image upload has yet been observed.** The Chrome write-size and incomplete-image recovery remain unverified. The user must decide to start the attempt in their own browser.

## First live upload result and future write caution (14 October 2026)

**Physical result now verified:** User's Android Chrome screenshot reports 126/126 acknowledged image packets and final EPD refresh write in 9.3 seconds. User's photograph visibly confirms the first InkLink English 400×300 image displayed on the actual NRF- clock. Thus an actual 244-byte write and subsequent full image transmission/refresh succeeded in this session.

**Unresolved visual quality:** heavy ghosting from original built-in Chinese face, particularly background digits and footer; English footer is small and imperfect. This is **not a clean image refresh**. The new time is a static image. Future trials should prioritize non-destructive research, not repeated blind screen writes.

**Potential manufacturer clear command:** XLY95 main site includes a `clearScreen(cmd)` helper issuing EPD `00+cmd` followed by EPD `01`. Its acceptable arguments/side effects have NOT been verified on this specific panel. Do not transmit it without further investigation and explicit approval.

**Caution:** the successful run does not prove recovery from an interrupted write, persistent long-term connectivity or safe firmware reset. For any subsequent physical EPD changes request a new supervised action; never auto-repeat.

## Successful clean Clock-mode restoration (Test AK)

After a **completed** custom English image upload with visible persistent ghosting, the user switched to built-in Clock mode using the previously verified controls. **The original Chinese clock face appeared clean, without ghosting.** This provides a tested route to restore a clean normal display after a successful full-image upload.

**Scope restriction:** This observation does not prove that Clock mode restores an interrupted half-written EPD frame or implements a general erase/rollback protocol. The custom-image ghosting remains unresolved. The next stage should analyze the firmware's refresh behavior without sending guessed clearing commands.

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
