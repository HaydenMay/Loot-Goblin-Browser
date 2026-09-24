# Stage 2: Responsive Play Screen Foundation Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Replace the landscape title page with a full-screen, portrait-first dungeon view, minimal HUD, Pause/Resume overlay, and a forgiving floating touch joystick that does not move the Goblin yet.

**Architecture:** Phaser renders the static room and actors at a 720 × 1280 portrait reference size with `Phaser.Scale.EXPAND`. DOM/CSS renders the safe-area-aware HUD and an initially hidden floating joystick. The joystick tracks one touch pointer, derives a clamped visual knob offset through a pure helper, and leaves gameplay movement disconnected.

**Tech Stack:** TypeScript, Phaser 4.2.1, Vite, CSS, Node's built-in test runner, and the environment-provided Playwright package for local visual and touch verification when its browser is available.

**Spec:** `docs/superpowers/specs/2026-09-24-responsive-play-screen-design.md`

## Global Constraints

- Use 720 × 1280 as the portrait reference size.
- Use Phaser 4.2.1 `Phaser.Scale.EXPAND` so the canvas fills its parent while keeping the reference content at a uniform scale. On narrow/tall screens, more world height becomes visible; on wide screens, more world width becomes visible. Do not stretch objects or letterbox the play area.
- The game host fills the available viewport, including dynamic viewport sizing on mobile. Add `viewport-fit=cover` and apply CSS safe-area insets to DOM HUD elements.
- Handle resize and orientation changes through one scene layout path. Keep the room background covering the expanded logical view, and keep the Goblin and slime in the readable playable area.
- Phaser owns the game world. HTML/CSS owns the HUD and floating joystick presentation so it can respect safe areas and remain independent of camera coordinates. The joystick belongs to the viewport-level play surface, not a fixed corner or camera position.
- Stage 2 only renders and verifies joystick touch response. It does not send joystick direction to the Goblin or implement movement.
- Do not add a framework or new runtime dependency for this stage.
- Preserve the existing Vite Pages base and deploy workflow; the confirmed route is `https://haydenmay.github.io/Loot-Goblin-Browser/`.

## Review Focus

1. A touch that starts at each screen edge and corner still activates the joystick at that origin; tested in Task 2 using real touch input in Playwright.
2. Pointer up, cancellation, and movement outside the play surface all end the same active joystick; tested in Task 2 through touch lifecycle checks.
3. Pause and Resume taps remain UI actions and never begin a joystick; tested in Task 2 alongside the accessible pause state.
4. Desktop plus touchscreen hybrid input stays usable while the joystick is hidden at rest; tested in Task 2 with touch emulation and a fine-pointer desktop context.
5. Resize and orientation changes preserve circular marker proportions, avoid blank room edges, and keep HUD controls inside safe viewport bounds; tested in Task 1 at the four spec viewport sizes and rechecked after rotation.

---

### Task 1: Responsive Phaser Room and Viewport

**Files:**
- Create: `src/game/world-layout.ts`
- Create: `src/game/PrototypeScene.ts`
- Create: `tests/world-layout.test.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `index.html`
- Modify: `package.json` only to add the built-in Node test command
- Modify: `tsconfig.json` to type-check the test sources

**Interfaces:**
- Produces `getWorldLayout(width: number, height: number)`, returning normalized in-bounds `goblin` and `slime` marker coordinates used by `PrototypeScene` after initial creation and every resize.
- Produces a `PrototypeScene` with one room-render path called from scene creation and the Phaser resize event.
- Preserves the current `#game` Phaser parent and Vite base behavior.

- [ ] **Step 1: Write the failing layout test**

Create a Node test that runs `getWorldLayout` against 720 × 1280, 390 × 844, 844 × 390, and 1365 × 768. For each size assert both markers stay at least 6% of width/height from the edge and are at least 12% of the smaller viewport dimension apart.

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --experimental-strip-types --test tests/world-layout.test.ts`
Expected: FAIL because `src/game/world-layout.ts` does not exist yet.

- [ ] **Step 3: Implement the tested layout helper and Phaser scene**

Implement `getWorldLayout` with relative coordinates: Goblin at `(0.46 × width, 0.62 × height)` and slime at `(0.68 × width, 0.40 × height)`, clamping each coordinate to the test's 6% insets for very small views. Build a tiled stone floor and small static crate/torch accents with Phaser Graphics. Add a flat green Goblin marker, a gray rectangular hammer, and one green slime marker. On resize, redraw the room to cover the current `scale.width` and `scale.height`, reposition the markers with `getWorldLayout`, and keep marker geometry circular in game space.

Configure Phaser with 720 × 1280 and `Phaser.Scale.EXPAND`. Set `index.html` to include `viewport-fit=cover`, update the page title, and make `#game` fill `100vw × 100dvh` with a `100vh` fallback. Use the same scene resize path for orientation changes. Add `npm test` using Node's built-in runner and include `tests/**/*.test.ts` in `tsconfig.json`; add no test package.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: layout test passes for all four dimensions; TypeScript and Vite build exit 0.

- [ ] **Step 5: Commit the responsive room task**

Commit message: `feat: add responsive prototype room`

### Task 2: Safe-Area HUD, Pause, and Floating Touch Joystick

**Files:**
- Create: `src/ui/GameHud.ts`
- Create: `src/input/VirtualJoystick.ts`
- Create: `src/input/joystick-controller.ts`
- Create: `src/input/joystick-math.ts`
- Create: `tests/joystick-controller.test.ts`
- Create: `tests/joystick-math.test.ts`
- Create: `tests/ui-controls.test.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `package.json` only if the test command needs a test glob adjustment

**Interfaces:**
- Consumes the `#game` host created by Task 1. The DOM HUD and joystick do not depend on a Phaser object; they sit above the Phaser canvas.
- Produces `calculateKnobOffset(dx: number, dy: number, radius: number, deadZone: number)`, returning a clamped `{ x, y }` visual offset. Within the dead zone the result is zero; outside it the magnitude ramps smoothly to the radius without changing direction.
- Produces `new JoystickController(radius: number, deadZone: number)`, which accepts only one touch pointer at a time, ignores interactive UI starts, tracks the origin, and filters move/end events by pointer id.
- Produces `new VirtualJoystick(playSurface, joystickElement, knobElement, eventTarget = window)`, which adapts DOM pointer events to `JoystickController` and updates the floating joystick visuals. The injectable event target lets Node tests verify pointer events that continue outside the play surface.
- Produces `new GameHud(playSurface)`, which owns the Pause/Resume overlay and marks interactive targets so joystick start ignores them.

- [ ] **Step 1: Write failing joystick math tests**

Test that a vector inside the dead zone returns `{ x: 0, y: 0 }`, a vector beyond the dead zone produces a smooth nonzero offset in the same direction, a vector longer than the radius clamps to that radius without changing direction, and a non-positive radius returns `{ x: 0, y: 0 }`.

- [ ] **Step 2: Run the test and confirm the missing-helper failure**

Run: `node --experimental-strip-types --test tests/joystick-math.test.ts`
Expected: FAIL because `calculateKnobOffset` is not defined.

- [ ] **Step 3: Implement the joystick math helper**

Use the normalized distance between `deadZone` and `radius`, then smoothstep `t * t * (3 - 2 * t)` to scale the direction. Clamp the input distance to the radius before computing the knob position. Reject invalid non-positive radius by returning `{ x: 0, y: 0 }`.

- [ ] **Step 4: Run the math tests and confirm they pass**

Run: `node --experimental-strip-types --test tests/joystick-math.test.ts`
Expected: all four joystick math tests pass.

- [ ] **Step 5: Write failing pointer-controller tests**

Test that a touch begins at arbitrary coordinates, a mouse or interactive-target start is rejected, a second pointer cannot take ownership, only the active pointer changes the knob offset, and pointer up/cancel clears the active pointer.

- [ ] **Step 6: Run the pointer-controller test and confirm it fails for the missing module**

Run: `node --experimental-strip-types --test tests/joystick-controller.test.ts`
Expected: FAIL because `src/input/joystick-controller.ts` does not exist yet.

- [ ] **Step 7: Implement and test the pure pointer controller**

Implement `begin(pointerId, pointerType, x, y, isInteractiveTarget)`, `move(pointerId, x, y)`, `end(pointerId)`, `activePointerId`, and `origin`. A valid begin stores the pointer id and exact origin. Move returns `null` for any other pointer and delegates the active pointer delta to `calculateKnobOffset`. End returns `false` for any other pointer; for the active pointer it clears ownership and returns `true`.

Run: `node --experimental-strip-types --test tests/joystick-controller.test.ts`
Expected: all pointer-controller tests pass.

- [ ] **Step 8: Write failing HUD and DOM pointer tests**

In `tests/ui-controls.test.ts`, use small `EventTarget`-based test elements to construct `GameHud` and `VirtualJoystick` without a browser. Assert Pause opens the overlay and focuses Resume, Resume closes it and restores focus, a touch at a nonzero host offset positions the joystick at the matching host-relative point, pointer movement updates knob offsets, pointerup/cancel/lost capture hides it, and mouse or interactive-target starts do not reveal it.

- [ ] **Step 9: Run the UI-control test and confirm the missing-module failure**

Run: `node --experimental-strip-types --test tests/ui-controls.test.ts`
Expected: FAIL because `src/ui/GameHud.ts` and `src/input/VirtualJoystick.ts` do not exist yet.

- [ ] **Step 10: Implement the HUD and DOM pointer adapter**

Render only Pause, Level/progress, and Gold at the top with safe-area padding. Pause opens a small accessible dialog containing Resume; Resume closes it and returns focus to Pause. Informational HUD text remains touch-through and may start the joystick. Buttons and the open pause dialog are excluded from joystick activation.

The joystick starts hidden. On the first touch pointerdown on any non-interactive point of `#game`, set its base to that exact viewport point, capture that pointer, and show it. Follow only that pointer, clamp the knob with `calculateKnobOffset`, ignore mouse pointers, and end/hide the gesture on pointerup, pointercancel, lost pointer capture, or when the active touch moves outside the play surface. Use `touch-action: none` on the play surface so a drag cannot scroll the page; keep HUD buttons clickable. Use `(any-pointer: coarse)` so hybrid devices retain touch support and fine-pointer desktops do not show an idle control.

- [ ] **Step 11: Run the full unit suite and production build**

Run: `npm test && npm run build`
Expected: all layout and joystick tests pass, TypeScript and Vite build exit 0.

- [ ] **Step 12: Commit and push the completed Stage 2 implementation to `main`**

Commit message: `feat: add floating touch joystick and minimal hud`

## Final Verification

- [ ] Run `npm test && npm run build` and read the complete output.
- [ ] Use the connected browser on the deployed Pages route to capture the available viewport screenshot, inspect the play screen, and click Pause then Resume; review browser console errors.
- [ ] Confirm mobile viewport geometry with the layout unit test. If local Playwright Chromium is unavailable, report that detailed multi-size browser screenshots and real iPhone touch still need a device/browser run.
- [ ] Verify production asset requests use `/Loot-Goblin-Browser/` in the production preview.
- [ ] Check the deployed `/Loot-Goblin-Browser/` route after push and report that iPhone Safari still needs the user's on-device confirmation.
