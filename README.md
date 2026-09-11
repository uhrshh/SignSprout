# Signsprout

A browser-based ASL foundations course: eight units, 71 learning cards, the complete alphabet, numbers 1–10, 24 everyday signs, conversation practice, unit checkpoints, and scheduled review.

## Run

Use Node 22.13+ and pnpm:

```sh
pnpm install
pnpm dev --host localhost --port 3001
```

Open http://localhost:3001 and allow camera access when you start practice. No API key is required. Keep the development server running while using the app. `pnpm build` checks the production build.

The project includes its original Sites registration in `.openai/hosting.json`; cloning this repository does not grant access to that deployment. GitHub stores the source and does not automatically host the running app.

## Camera behavior

TensorFlow.js runs MediaPipe Hands locally, using WebGL with a CPU fallback. Models are bundled under `public/models`, avoiding TF Hub redirects. `prepareVideo` in `app/tracker.ts` copies intrinsic `videoWidth/videoHeight` to the width/height attributes read by the detector; omitting this produces invalid landmarks. The UI rejects non-finite landmarks and stops camera tracks when the practice panel unmounts.

Camera challenges now cover all 26 alphabet letters, numbers 1–10, and the 24 course vocabulary signs. Conversation cards require their component signs. Next stays locked until a fresh camera match; reading cards retain a read-completion button.

This is **experimental reference matching**, not a trained, independently validated full-ASL classifier. Static letters/numbers use wrist-centered, palm-scaled landmarks compared with ASLU reference templates, with ambiguity and distance rejection. H uses a geometric sideways-U template because the provided foreshortened H photograph did not yield usable landmarks. J/Z require a valid starting handshape and a fingertip trajectory. Words use local MediaPipe Holistic hand/body tracking and dynamic time warping against demonstration sequences, including body-relative location and mirror handling. PLEASE, MY, YOU, and number 10 use explicit handshape/location/movement rules. Facial grammar and full conversational fluency are **not assessed**. Single-view occlusion, lighting, hand differences, perspective, and valid signing variants can cause errors.

No confidence percentages or population accuracy claims are presented. Two candidate pretrained alphabet models were evaluated locally and rejected for poor transfer to these references; their weights are not shipped. Reference tests do not measure performance on new signers. Before treating this as a reliable learning assessment, gather consenting, independently labeled recordings from multiple fluent signers and beginners and measure per-sign false accepts/rejects, including confusable and out-of-course signs.

Camera help contains a non-awarding diagnostic. For alphabet lessons it exercises video input using four reference photos. For word lessons it runs body/hand tracking and HELLO sequence matching against a local video. Diagnostics never call the completion callback.

## Progress and guide

Progress is stored in localStorage (`signsprout-course-v2`) and the earlier four-letter progress is migrated. Repeated practice does not grant duplicate XP. A unit requires every card plus a checkpoint score of at least 80%. Review intervals are 1, 2, 4, 8, then 14 days; missed cards remain due. The progress page exports JSON.

The guide retrieves authored course content locally. It is a bounded retrieval guide, not a generative LLM or a semantic embedding service.

## Validation

- `pnpm exec tsc --noEmit`
- `pnpm build`
- `scripts/course.test.ts` covers course reachability and asset existence, content integrity, migration, malformed local storage, deduplicated completion, unit mastery, review scheduling, guide retrieval, camera dimensions, and invalid landmarks. Bundle it for Node using esbuild (included transitively by Vite), then run the bundle.
- `scripts/recognition.test.ts` checks all static templates and reflections, recorded gesture templates, cross-sign rejection, J/Z trajectories, invalid input and sustained-hold lifecycle. The browser HELLO diagnostic verifies the actual WASM/video path.
- `scripts/check-hand-models.mjs` runs CPU inference on four padded real reference photographs and a blank input. Set `SHARP_MODULE` to an installed Sharp module.
- Test the browser video-input check before publishing any camera changes.

## Teaching material

ASL University / Dr. William G. Vicars is the reference for signs and demonstrations. Original source URLs are retained in `app/media.json` and every demonstration has visible attribution and a source link. Media remains copyright its original author. YouTube is loaded only when the learner requests a video. Local camera video is never uploaded by this app.

This is an introductory practice course, not a fluency certification or substitute for instruction from Deaf teachers and qualified ASL instructors. Demonstrations show particular accepted forms; natural signing includes variation.

## Reference preparation

The Python extraction scripts require an isolated environment with MediaPipe 0.10.21, NumPy, OpenCV and Pillow. They operate on reference media, not user webcam recordings. Raw research files are ignored by git; deployable normalized reference data is under `public/models`. `compile-gesture-references.ts` converts extracted landmarks to the browser representation. Source URLs and geometric-template provenance are recorded in `public/models/REFERENCE-NOTICE.txt`. MediaPipe Holistic 0.5.1675471629 is bundled locally with its Apache-2.0 license.

## Beginner tolerance and two-hand recovery

Static matching allows small wrist tilts (±12°), size/proportion variation, and a larger distance budget (0.38); a different best letter still cannot pass the target. A short uncertain detection pauses rather than clears the hold, contributes no hold time, and cannot complete a lesson. A known wrong sign or prolonged tracking loss resets it. Movement matching allows up to a 12-second performance window and brief occlusions while retaining required movement and multi-hand evidence.

Holistic and the fallback detector read the same captured canvas frame. An independent TensorFlow.js detector searches for two hands only when the current lesson requires them (or when no hand was found); wrist crops recover small hands. Slow inference no longer counts as an interruption between frames, and two missing body frames do not immediately erase the movement history. Current-frame candidates are assigned against body wrist locations; low-confidence, duplicate and distant detections are rejected. Landmarks are never copied into both hand slots or carried forward as fabricated detections. The status reports the number of tracked hands. The tolerance tests cover perturbations, uncertain holds, brief occlusion, permanent missing-hand rejection and assignment, but do not establish real-signer accuracy.

Movement comparisons tolerate up to 15 degrees of hand-angle variation and bounded hand-size differences, and cap sequence samples to limit scoring overhead. `gesture-variation.test.ts` covers the 12 reported signs using synthetic angle, size, placement, pace and mirror variations plus stationary and wrong-sign rejection. `run-body-tracker-test.mjs` checks frame consistency and the single-hand fast path with a mocked detector. These do not measure accuracy on independent signers; the SLOW reference currently contains landmarks for only its moving hand, so its supporting handshape is not fully graded.

## Short movement attempts

The live movement scorer now evaluates recent observed-frame suffixes, rather than only fixed time windows with an eight-frame minimum. An attempt needs at least four actual observations spanning 600 ms; observations separated by more than two seconds cannot be joined. The existing best-sign, distance, motion and two-hand checks remain. `scripts/attempts.test.ts` covers short WANT/HELP and final-unit reference performances, preparation frames, missing hands, stationary/too-short/disconnected attempts, and 420 wrong-sign comparisons through this live selector. These are reference-derived regressions, not independent user validation.

UNDERSTAND also uses its closed-to-upright-index transition near the forehead. The location constraint rejects the YES reference, which the looser original rule incorrectly accepted. `scripts/understand.test.ts` exercises that distinction and stationary/wrong-location negatives; its reference audit uses the ignored research landmark file when present.

## Movement-first attempt matching

Movement lessons select attempts by elapsed time (350 ms minimum, up to 12 seconds), without a fixed camera-frame quota. Consecutive unchanged observations are collapsed before sequence comparison so a pause does not outweigh the motion. Matching allows a 0.50 distance budget and a 0.015 ambiguity margin, while requiring movement, two-hand evidence where applicable, and the closest recognized sign. The attempt selector chooses the strongest recognized movement across time windows instead of cherry-picking a weaker suffix for the requested word. The camera status shows tracked hands rather than a frame counter. `movement-timing.test.ts` checks identical paths at different observation densities; these synthetic checks do not establish live-user recognition accuracy.
