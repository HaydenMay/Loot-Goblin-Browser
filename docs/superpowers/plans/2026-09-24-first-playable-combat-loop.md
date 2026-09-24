# Stage 3: First Playable Combat-and-Loot Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the touch joystick to Goblin movement, stop-to-attack slime combat, coin pickup, and the Gold HUD in the existing room.

**Architecture:** `VirtualJoystick` reports a bounded analog vector through a callback. Pure TypeScript movement, attack, slime-health, and coin helpers keep behavior testable without Phaser. `PrototypeScene` owns the live run and Phaser effects; `main.ts` wires scene callbacks to the DOM-only `GameHud`, which reports pause/resume and displays collected Gold.

**Tech Stack:** TypeScript, Phaser 4.2.1, Vite, CSS, and Node's built-in test runner. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-24-first-playable-combat-loop-design.md`

## File Map

- `src/shared/vector2.ts` defines the shared bounded input vector type.
- `src/input/VirtualJoystick.ts` turns the active touch into analog input and owns listener cleanup.
- `src/game/movement.ts` contains frame-capped movement and safe-bound clamping.
- Existing `src/game/world-layout.ts` supplies normalized initial Goblin and slime spawn positions.
- `src/game/combat/auto-attack.ts` owns target selection, wind-up cancellation, impact, and repeat timing.
- `src/game/combat/slime-health.ts` owns the slime's once-only death transition.
- `src/game/loot/coin-collection.ts` owns capped coin magnet movement and once-only pickup.
- `src/game/PrototypeScene.ts` owns run state, actor/coin objects, attack and loot effects, resizing, and scene shutdown.
- `src/ui/GameHud.ts` owns DOM Gold updates and accessible Pause/Resume behavior; it does not import Phaser.
- `src/main.ts` creates one instance of each system and connects joystick, scene, and HUD callbacks.
- `index.html` supplies the accessible Gold value and existing HUD elements.
- `tests/ui-controls.test.ts`, `tests/movement.test.ts`, `tests/auto-attack.test.ts`, `tests/slime-health.test.ts`, and `tests/coin-collection.test.ts` cover those responsibilities with Node's test runner.

## Global Constraints

- Keep the 720 × 1280 portrait reference size and Phaser 4.2.1 `Phaser.Scale.EXPAND` viewport behavior.
- Keep the full-viewport mobile layout, `viewport-fit=cover`, and safe-area HUD padding.
- Preserve the floating joystick behavior: hidden while idle, anchored wherever a valid touch begins, driven only by its active touch, and hidden/reset on release or cancellation.
- Preserve the working GitHub Pages route and `/Loot-Goblin-Browser/` base.
- Use the existing room, one slime, and placeholder shapes; add no runtime dependencies.
- Keep the play HUD limited to Pause, Level/progress, and Gold.
- Use the spec's initial tuning: about 220 logical pixels/second movement, about 100 logical pixels melee range, about 180 ms wind-up, about 750 ms repeat interval, 3 slime hits, 3 one-Gold coins, and about 300 ms coin pop.
- Clamp one simulation step to 50 ms maximum; do not let oversized direction vectors increase diagonal speed.
- Use `import type` for type-only imports because `verbatimModuleSyntax` is enabled in `tsconfig.json`.
- Before each task commit/push to `main`, run `npm test && npm run build`; every pushed task must leave the Pages workflow buildable.
- Keep enemy AI/attacks, obstacle collision, room transitions, procedural rooms, inventory/capacity, equipment, upgrades, saving, audio, final art, PWA, accounts, and monetization out of scope.

## Review Focus

1. Touch release, cancel, leaving the play surface, a second pointer, disabling controls during Pause, and destroying the joystick all preserve active-pointer ownership, clear the movement vector, and hide the control. Pin these cases in Task 1.
2. Diagonal input, analog input below full strength, a frame longer than 50 ms, and portrait/landscape bounds preserve the expected speed and safe position. Pin these cases in Task 2.
3. A swing interrupted by movement, target death, or leaving melee range cannot apply damage; dead or out-of-range slimes are never selected. Pin these cases in Task 3.
4. Repeated damage after slime death cannot create another death event or another coin burst. Pin this in Task 4.
5. Coin pickup at the sack radius, repeated updates after pickup, and Pause during magnet movement cannot add Gold twice or advance loot while paused. Pin the model in Task 4 and pause wiring/live behavior in Tasks 6–7.

---

### Task 1: Emit and reset analog joystick input

**Files:**
- Create: `src/shared/vector2.ts`
- Modify: `src/input/VirtualJoystick.ts`
- Test: `tests/ui-controls.test.ts`

**Interfaces:**
- Produces `Vector2 { x: number; y: number }`, with each component bounded to `[-1, 1]` and vector magnitude at most `1`.
- Extends the existing `VirtualJoystick` constructor with a fifth argument `onDirectionChange: (vector: Vector2) => void`, after the existing injectable `eventTarget` argument. The default callback is a no-op.
- Produces `setEnabled(enabled: boolean): void` and `destroy(): void` on `VirtualJoystick`.
- A valid pointer move reports `knobOffset / JOYSTICK_RADIUS`; valid begin reports neutral, and up, cancel, lost capture, pointer exit, disable, or destroy report `{ x: 0, y: 0 }` when they clear an active gesture.

- [ ] **Step 1: Add failing joystick direction, reset, and lifecycle tests**

In `tests/ui-controls.test.ts`, import `Vector2` as a type from `../src/shared/vector2.ts`, then collect callback vectors while dispatching the existing fake pointer events:

```ts
const directions: Vector2[] = [];
const joystick = new VirtualJoystick(
  playSurface as unknown as HTMLElement,
  joystickElement as unknown as HTMLElement,
  knobElement as unknown as HTMLElement,
  eventTarget,
  (vector) => directions.push(vector),
);
```

Start at client `(140, 240)` on the existing surface offset `(20, 40)`, move to `(160, 240)`, then to `(250, 240)`. Assert begin reports neutral, the first movement has `0 < x < 1` and `y === 0`, the second has `x === 1`, and pointerup reports neutral. While pointer 4 is active, start pointer 5 and move it; assert neither event changes the direction callback. Add neutral-callback assertions to the existing pointer-cancel, lost-capture, and leaving-surface tests. In a second test, disable during an active touch; assert the joystick hides, emits neutral, rejects a new start while disabled, and accepts a fresh start after re-enabling. In a third test, destroy during an active touch; assert it hides, emits neutral, and ignores later pointer events without adding another callback.

- [ ] **Step 2: Run the UI test and confirm the missing callback behavior**

Run: `node --experimental-strip-types --test tests/ui-controls.test.ts`
Expected: FAIL because `Vector2`, the direction callback, `setEnabled`, and `destroy` are not implemented.

- [ ] **Step 3: Implement vector output and lifecycle control**

Add the shared type:

```ts
export interface Vector2 {
  x: number;
  y: number;
}
```

Add an `enabled` flag and the callback to `VirtualJoystick`. After valid begin, report `{ x: 0, y: 0 }`; after a valid move, divide each clamped knob offset by `JOYSTICK_RADIUS` and report that vector. Refactor pointer-end cleanup into a helper that ends the active pointer, hides the joystick, resets the knob, reports neutral, and releases capture. `setEnabled(false)` clears the active gesture (and reports neutral even if already idle) before rejecting future starts; `setEnabled(true)` waits for a new pointerdown. `destroy()` removes the two surface and three event-target listeners and clears any active gesture.

- [ ] **Step 4: Run UI tests and confirm callback/reset behavior**

Run: `node --experimental-strip-types --test tests/ui-controls.test.ts`
Expected: all existing and new UI-control tests pass.

- [ ] **Step 5: Commit and push Task 1 to `main`**

```bash
git add src/shared/vector2.ts src/input/VirtualJoystick.ts tests/ui-controls.test.ts
git commit -m "feat: emit movement input from touch joystick"
git push origin main
```

### Task 2: Add bounded frame-based Goblin movement

**Files:**
- Create: `src/game/movement.ts`
- Test: `tests/movement.test.ts`

**Interfaces:**
- Consumes type-only `WorldPoint` from `src/game/world-layout.ts` and `Vector2` from `src/shared/vector2.ts`.
- Produces `clampFrameDelta(deltaMs: number): number`, clamped to `[0, 50]` and returning `0` for non-finite input.
- Produces `moveWithinBounds(position, direction, deltaMs, speed, bounds): WorldPoint`, where `bounds` is `{ left, top, right, bottom }`. It preserves analog magnitude up to `1`, normalizes over-length vectors, applies the bounded delta, and clamps the result inside the supplied actor-center bounds.

- [ ] **Step 1: Write failing movement tests**

Create `tests/movement.test.ts` with Node's `assert` and `test` imports, plus `clampFrameDelta` and `moveWithinBounds` from `../src/game/movement.ts`. Cover a half-strength cardinal input, normalized diagonal input, a 200 ms frame being capped to 50 ms, neutral and negative-delta input, and position clamping at each room edge. Include both `720 × 1280` and `844 × 390` bounds. Pass a position that was valid in portrait but falls outside the landscape bounds with zero input and zero delta; assert it clamps to the new bounds, then verify the reverse resize. This pins safe-position behavior without adding movement during resize.

```ts
const moved = moveWithinBounds(
  { x: 100, y: 100 },
  { x: 0.5, y: 0 },
  50,
  220,
  { left: 20, top: 20, right: 700, bottom: 1260 },
);
assert.deepEqual(moved, { x: 105.5, y: 100 });
assert.equal(clampFrameDelta(200), 50);
```

- [ ] **Step 2: Run the movement test and confirm the missing-module failure**

Run: `node --experimental-strip-types --test tests/movement.test.ts`
Expected: FAIL because `src/game/movement.ts` does not exist.

- [ ] **Step 3: Implement the pure movement helpers**

Use a 50 ms maximum frame step. For an input vector with magnitude `m`, set `strength = min(1, m)` and multiply the normalized direction by `speed * strength * boundedDelta / 1000`. Clamp the supplied position even for zero input, non-positive speed, or zero bounded delta; otherwise clamp the moved position to the matching bounds. This means viewport resize can safely clamp the current position with a zero-input, zero-delta call.

- [ ] **Step 4: Run movement tests and confirm all cases pass**

Run: `node --experimental-strip-types --test tests/movement.test.ts`
Expected: all movement tests pass, including equal total speed for cardinal and diagonal full-strength input and position clamping after portrait/landscape resize.

- [ ] **Step 5: Commit and push Task 2 to `main`**

```bash
git add src/game/movement.ts tests/movement.test.ts
git commit -m "feat: add bounded Goblin movement math"
git push origin main
```

### Task 3: Add stop-to-attack targeting and timing

**Files:**
- Create: `src/game/combat/auto-attack.ts`
- Test: `tests/auto-attack.test.ts`

**Interfaces:**
- Consumes `WorldPoint` and `clampFrameDelta` from Task 2.
- Produces `AttackTarget { id: string; x: number; y: number; alive: boolean }`.
- Produces `AutoAttackEvent` as one of `{ type: 'windup-start'; targetId }`, `{ type: 'impact'; targetId; damage }`, or `{ type: 'windup-cancel'; targetId }`.
- Produces `AutoAttackController(range, windupMs, repeatIntervalMs, damage)` with `update(deltaMs, moving, player, targets): AutoAttackEvent[]` and `reset(): void`. The repeat interval is measured from one wind-up start to the next. A locked target is looked up by id on each update, so target death or movement out of range can cancel a pending swing.

- [ ] **Step 1: Write failing auto-attack state tests**

Create `tests/auto-attack.test.ts` with Node's `assert` and `test` imports, type imports `WorldPoint` and `AttackTarget`, and `AutoAttackController` from `../src/game/combat/auto-attack.ts`. Assert movement never starts an attack; stopping in range emits one `windup-start`; the 180 ms wind-up emits one impact; moving before impact emits `windup-cancel` and no impact; killing the locked target or moving it beyond range before impact also cancels with no impact; a dead or out-of-range target is ignored; and the nearest living in-range target is selected. After impact, assert the next wind-up starts no earlier than 750 ms after the previous wind-up start and never starts while moving. Simulate elapsed time in increments no larger than 50 ms so the tests exercise the production frame cap.

```ts
const player: WorldPoint = { x: 0, y: 0 };
const slime: AttackTarget = { id: 'slime', x: 50, y: 0, alive: true };
const controller = new AutoAttackController(100, 180, 750, 1);
assert.deepEqual(controller.update(50, true, player, [slime]), []);
assert.deepEqual(controller.update(0, false, player, [slime]), [
  { type: 'windup-start', targetId: 'slime' },
]);
assert.deepEqual(controller.update(50, true, player, [slime]), [
  { type: 'windup-cancel', targetId: 'slime' },
]);
```

- [ ] **Step 2: Run the attack test and confirm the controller is missing**

Run: `node --experimental-strip-types --test tests/auto-attack.test.ts`
Expected: FAIL because `src/game/combat/auto-attack.ts` does not exist.

- [ ] **Step 3: Implement the deterministic auto-attack controller**

Implement `ready`, `windup`, and `cooldown` phases. When ready and stationary, choose the nearest alive target whose center is within range and emit `windup-start`. During wind-up, cancel if movement resumes or the current target with the locked id is missing, dead, or leaves range. Otherwise, after the accumulated bounded delta reaches `windupMs`, emit one impact and enter cooldown with `max(0, repeatIntervalMs - windupMs)` remaining; this keeps starts at least `repeatIntervalMs` apart. Advance cooldown while moving, but start a new wind-up only while stationary. `reset()` returns to ready with no target and no elapsed time.

- [ ] **Step 4: Run attack tests and confirm target/timing behavior**

Run: `node --experimental-strip-types --test tests/auto-attack.test.ts`
Expected: all tests pass; every impact follows a valid wind-up and target check.

- [ ] **Step 5: Commit and push Task 3 to `main`**

```bash
git add src/game/combat/auto-attack.ts tests/auto-attack.test.ts
git commit -m "feat: add stationary auto-attack controller"
git push origin main
```

### Task 4: Add slime health and once-only coin collection

**Files:**
- Create: `src/game/combat/slime-health.ts`
- Create: `src/game/loot/coin-collection.ts`
- Test: `tests/slime-health.test.ts`
- Test: `tests/coin-collection.test.ts`

**Interfaces:**
- Produces `applySlimeDamage(state, damage): { state: SlimeHealthState; applied: boolean; killed: boolean }`, with `SlimeHealthState { current: number; max: number; dead: boolean }`. `killed` is true only on the transition from alive to dead.
- Produces `advanceMagnetCoin(coin, goblin, deltaMs, speed, pickupRadius): { coin: MagnetCoin; collectedNow: boolean }`, with `MagnetCoin { id: number; value: number; x: number; y: number; collected: boolean }`. It moves toward the current Goblin position, uses Task 2's bounded frame delta, never overshoots the pickup radius, and reports collection once.

- [ ] **Step 1: Write failing slime and coin model tests**

In `tests/slime-health.test.ts`, import `applySlimeDamage` and `type SlimeHealthState` from `../src/game/combat/slime-health.ts`; apply 1 damage three times to 3 HP, assert death occurs only on the third hit, then assert further damage leaves the dead state unchanged and never reports a second kill.

In `tests/coin-collection.test.ts`, import `advanceMagnetCoin` and `type MagnetCoin` from `../src/game/loot/coin-collection.ts`; assert a coin moves toward the Goblin, reports `collectedNow: true` when it enters the pickup radius, then remains collected with `collectedNow: false` on repeated updates. Also assert a 200 ms update moves no farther than the 50 ms cap permits.

```ts
const coin: MagnetCoin = { id: 1, value: 1, x: 0, y: 0, collected: false };
const first = advanceMagnetCoin(coin, { x: 100, y: 0 }, 50, 400, 12);
assert.ok(first.coin.x > coin.x);
assert.equal(first.collectedNow, false);
const pickedUp = advanceMagnetCoin({ ...coin, x: 90 }, { x: 100, y: 0 }, 50, 400, 12);
assert.equal(pickedUp.coin.collected, true);
assert.equal(pickedUp.collectedNow, true);
const capped = advanceMagnetCoin(coin, { x: 100, y: 0 }, 200, 400, 12);
assert.equal(capped.coin.x, 20);
```

- [ ] **Step 2: Run the new model tests and confirm missing-module failures**

Run: `node --experimental-strip-types --test tests/slime-health.test.ts tests/coin-collection.test.ts`
Expected: FAIL because the two model modules do not exist.

- [ ] **Step 3: Implement the slime damage and coin motion models**

`applySlimeDamage` returns an unchanged copy for dead slimes or non-positive damage; otherwise subtract damage down to zero and report `killed` only if the prior state was alive. `advanceMagnetCoin` returns collected coins unchanged; if the current or next position enters the pickup radius, return a collected coin snapped to the Goblin position with `collectedNow: true`; otherwise advance toward the Goblin by at most `speed * clampFrameDelta(deltaMs) / 1000`.

- [ ] **Step 4: Run slime and coin tests**

Run: `node --experimental-strip-types --test tests/slime-health.test.ts tests/coin-collection.test.ts`
Expected: all tests pass, including exactly-once kill and collection transitions.

- [ ] **Step 5: Commit and push Task 4 to `main`**

```bash
git add src/game/combat/slime-health.ts src/game/loot/coin-collection.ts tests/slime-health.test.ts tests/coin-collection.test.ts
git commit -m "feat: add slime damage and coin pickup models"
git push origin main
```

### Task 5: Connect movement, combat, and loot in the Phaser room

**Files:**
- Modify: `src/game/PrototypeScene.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes `Vector2`, `moveWithinBounds`, `AutoAttackController`, `applySlimeDamage`, and `advanceMagnetCoin` from Tasks 1–4.
- Produces `PrototypeScene.setMovementVector(vector: Vector2): void` for `main.ts` to call.
**Test:** Existing model tests from Tasks 1–4 plus a connected-browser gameplay smoke check using the in-skill Playwright surface; do not add a runtime or browser-test dependency.

- `PrototypeScene` owns `movementVector`, `attackController`, `slimeHealth`, `slimeDead`, `coins`, `gold`, and `hammerPivot`; it resets run state when a run starts. Its constructor accepts an optional `onGoldChanged: (gold: number) => void` callback, defaults it to a no-op for this independently buildable task, and reports initial `0` plus each collected coin total.
- `PrototypeScene.setMovementVector(vector: Vector2): void` copies its input so callers cannot mutate scene state afterward.
- Its private handlers are `beginHammerWindup(): void`, `cancelHammerWindup(): void`, and `applySlimeImpact(damage: number): void`; the event loop calls only these three defined handlers.

- [ ] **Step 1: Refactor the Goblin drawing into a separately animated hammer pivot**

In `createGoblin`, rename the existing body `Graphics` to `bodyArt`, keep the sack/body/head drawing, and remove the hammer rectangles from it. Add a child `Container` at the Goblin's hand position with the same gray placeholder hammer art, store it in `this.hammerPivot`, and return it inside the Goblin container. Keep the initial hammer angle neutral and preserve the current visual scale.

```ts
const hammerArt = this.add.graphics();
hammerArt.fillStyle(0xaaaead).fillRoundedRect(0, -3, 41, 7, 3);
hammerArt.fillStyle(0x787d7d).fillRoundedRect(31, -12, 15, 22, 3);
hammerArt.fillStyle(0xd0d3ce).fillRect(34, -10, 4, 18);
this.hammerPivot = this.add.container(22, -14, [hammerArt]);
return this.add.container(0, 0, [bodyArt, this.hammerPivot]);
```

- [ ] **Step 2: Add scene state, initial placement, and shutdown cleanup**

Add named constants for movement speed `220`, melee range `100`, wind-up `180`, repeat interval `750`, slime HP `3`, loot count `3`, coin value `1`, coin pop `300`, pickup radius `18`, and magnet speed `400`. Give the constructor the default callback `onGoldChanged: (gold: number) => void = () => {}` and call `super('prototype')`. In `create`, reset the vector, Gold, slime health/dead state, attack controller, and coin list; place Goblin and slime from `getWorldLayout`; report Gold `0`; then register one resize listener. In the `SHUTDOWN` handler, set movement neutral, reset the controller, kill scene tweens, clear any scene-owned coin state, and remove the resize listener. Do not add joystick or HUD listeners from `create`; `main.ts` owns one instance of each for the page lifetime.

- [ ] **Step 3: Implement frame-capped movement and resize-safe layout**

In `update(time, delta)`, build actor-center bounds from the current `gameSize` with a 6% inset on each axis. Call `moveWithinBounds` every frame, including zero-input frames, so the current Goblin position is clamped after resize. Determine moving state with `Math.hypot(vector.x, vector.y) > 0.01`. Refactor `layoutRoom` to redraw the floor and props without resetting the Goblin to its start position; on resize, clamp the existing Goblin and slime positions into current bounds. Keep props decorative and non-blocking.

- [ ] **Step 4: Connect stop-to-attack events to visible placeholder animation**

Pass the current Goblin center and a target entry `{ id: 'slime', x: slime.x, y: slime.y, alive: !slimeDead }` to `this.attackController`. `beginHammerWindup` faces the Goblin with `Math.atan2(slime.y - goblin.y, slime.x - goblin.x)` and tweens `hammerPivot.rotation` from neutral to `-1.1` radians over `180 ms`. `cancelHammerWindup` stops that tween and returns the hammer to neutral over `70 ms` without changing slime health. `applySlimeImpact` returns immediately if `slimeDead`; otherwise it swings the hammer to `0.75` radians over `70 ms`, returns it to neutral over `100 ms`, applies `applySlimeDamage` to `slimeHealth` and saves the returned state, adds a translucent pale-green ellipse over the slime and fades/destroys it over `90 ms`, then briefly recoils the slime by `10` logical pixels and restores its position. When `killed` first becomes true, set `slimeDead = true` before starting a `180 ms` squash/fade tween and hide the slime at its end; do not enqueue any further hits or drops.

```ts
for (const event of this.attackController.update(delta, moving, goblinPoint, targets)) {
  if (event.type === 'windup-start') this.beginHammerWindup();
  if (event.type === 'windup-cancel') this.cancelHammerWindup();
  if (event.type === 'impact') this.applySlimeImpact(event.damage);
}
```

- [ ] **Step 5: Pop coins, magnetize them, and update scene Gold exactly once**

At the single slime death transition, create three yellow circle objects and matching `MagnetCoin` models at the slime center; do not add a health bar. Keep each pair in a mutable `{ model, visual, popping: true }` entry. Give them fixed outward angles `0`, `2π/3`, and `4π/3`. Use a 180 ms outward tween followed by a 120 ms short downward bounce; copy the landing point into the model and mark the coin ready only after both tweens complete. Each scene update advances ready entries with `advanceMagnetCoin`, assigns the returned model, and moves the circle to the returned coordinates. On `collectedNow`, add `model.value` to scene Gold, remove the entry, destroy its circle, and call `onGoldChanged(gold)` once.

```ts
const angle = (Math.PI * 2 * coinIndex) / 3;
const landing = {
  x: slime.x + Math.cos(angle) * 64,
  y: slime.y + Math.sin(angle) * 64,
};
this.tweens.add({
  targets: coinState.visual,
  x: landing.x,
  y: landing.y - 18,
  duration: 180,
  onComplete: () => {
    this.tweens.add({
      targets: coinState.visual,
      y: landing.y,
      duration: 120,
      ease: 'Bounce.Out',
      onComplete: () => {
        coinState.model = { ...coinState.model, ...landing };
        coinState.popping = false;
      },
    });
  },
});
```

At the end of this step, update `src/main.ts` to construct one `PrototypeScene` instance, pass it in `scene: [prototypeScene]`, and give that scene's `setMovementVector` method to the joystick's fifth callback argument. Keep the existing `GameHud` construction until Task 6; its Gold display will be wired in that task.

```ts
const prototypeScene = new PrototypeScene();
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 720,
  height: 1280,
  backgroundColor: '#25231e',
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [prototypeScene],
});
new GameHud(playSurface);
new VirtualJoystick(
  playSurface,
  joystickElement,
  joystickKnob,
  window,
  (vector) => prototypeScene.setMovementVector(vector),
);
```

- [ ] **Step 6: Run tests/build and inspect the connected local scene**

Run: `npm test && npm run build`. Start `npm run dev -- --host 0.0.0.0` and open the local play surface in the connected browser. Use mobile touch emulation to move the Goblin around the room, release in range, observe three hammer impacts, defeat the slime, and watch each coin magnetize into the Goblin and disappear once. Also confirm the Goblin stays at its moved position after viewport resize, props stay non-blocking, and the page has no application console errors. Verify Gold updates after Task 6 wires it, then capture the final screenshot and repeat the complete touch check on the deployed URL in Task 7.

- [ ] **Step 7: Commit and push Task 5 to `main`**

```bash
git add src/game/PrototypeScene.ts src/main.ts
git commit -m "feat: connect combat and loot in the prototype room"
git push origin main
```

### Task 6: Wire Gold and functional accessible Pause/Resume

**Files:**
- Modify: `index.html`
- Modify: `src/ui/GameHud.ts`
- Modify: `src/main.ts`
- Modify: `tests/ui-controls.test.ts`

**Interfaces:**
- Produces `GameHudOptions { keyboardTarget?: EventTarget; onPauseChange?: (paused: boolean) => void }`.
- Extends `GameHud` with `setGold(gold: number): void` and `destroy(): void`.
- `GameHud` reports Pause/Resume state to `main.ts`; `main.ts` disables/enables the joystick and pauses/resumes the Phaser scene. The HUD imports no Phaser modules.

**Tests:** `tests/ui-controls.test.ts` for the DOM boundary, then connected-browser pause/resume smoke check.

- `GameHud` takes `(playSurface: HTMLElement, options: GameHudOptions = {})`; its default `keyboardTarget` is `window` in the browser and a new `EventTarget` when `window` is unavailable.
- It stores `#gold-panel`, `#gold-value`, `#pause-button`, `#pause-overlay`, and `#resume-button` once during construction.
- `index.html` gives the Gold panel and number stable IDs `gold-panel` and `gold-value`; the number has `aria-live="polite"`.
- `main.ts` constructs one HUD, one scene, one Phaser game, and one joystick. The app-level joystick and HUD listeners are disposed on `pagehide`; the scene independently resets and removes its resize listener on `SHUTDOWN`.

- [ ] **Step 1: Add failing Gold and Pause/Resume behavior tests**

Extend `FakeElement` with `textContent` and a `focusCount`; update the existing `GameHud` test to inject a keyboard `EventTarget` because Node has no `window`. Add fake `#gold-panel` and `#gold-value` children. Inject an `onPauseChange` callback. Assert `setGold(8)` displays `8` and sets `aria-label="Gold: 8"`; `setGold(-2)` displays `0`. Open Pause and assert the callback receives `true` and Resume receives focus. Dispatch cancelable Tab and Shift-Tab keydowns and assert each is prevented and returns focus to Resume. Dispatch Escape and assert the overlay closes, Pause receives focus, and the callback sequence is exactly `[true, false]`. Verify clicking Resume follows the same close path. In another test, call `destroy()`, dispatch later clicks and Escape, and assert neither callback nor focus count changes.

```ts
const tab = new Event('keydown', { cancelable: true });
Object.defineProperty(tab, 'key', { value: 'Tab' });
keyboardTarget.dispatchEvent(tab);
assert.equal(tab.defaultPrevented, true);
assert.equal(resume.focusCount, 2);
const shiftTab = new Event('keydown', { cancelable: true });
Object.defineProperties(shiftTab, {
  key: { value: 'Tab' },
  shiftKey: { value: true },
});
keyboardTarget.dispatchEvent(shiftTab);
assert.equal(shiftTab.defaultPrevented, true);
assert.equal(resume.focusCount, 3);
```

- [ ] **Step 2: Run UI tests and confirm the new behavior fails**

Run: `node --experimental-strip-types --test tests/ui-controls.test.ts`
Expected: FAIL because the HUD has no Gold setter, pause callback, keyboard handling, or disposal method.

- [ ] **Step 3: Implement Gold updates and accessible pause state**

Add the IDs and `aria-live` attribute in `index.html`. Set `keyboardTarget` to `options.keyboardTarget ?? (typeof window === 'undefined' ? new EventTarget() : window)`. `setGold` floors non-negative values, writes the displayed number, and updates the panel label:

```ts
const value = Math.max(0, Math.floor(gold));
this.goldValue.textContent = String(value);
this.goldPanel.setAttribute('aria-label', `Gold: ${value}`);
```

Track a private `paused` boolean so repeated events do not duplicate callbacks. Opening Pause displays the overlay, focuses Resume, then calls `onPauseChange(true)`. While paused, intercept Tab and focus the only focusable control, Resume; Escape prevents the default action and closes. Resume click and Escape both hide the overlay, restore focus to Pause, and call `onPauseChange(false)`. `destroy()` removes both click listeners and the injected key listener.

- [ ] **Step 4: Run UI tests and confirm keyboard, callback, and disposal behavior**

Run: `node --experimental-strip-types --test tests/ui-controls.test.ts`
Expected: all existing joystick/Pause tests and the new Gold, Tab, Escape, callback, and disposal tests pass.

- [ ] **Step 5: Wire one scene, joystick, and HUD instance in `main.ts`**

Declare optional `game` and `joystick` references, then add `GameHud` with an `onPauseChange` closure that returns until both references exist. Construct `PrototypeScene((gold) => hud.setGold(gold))`; pass that exact scene instance in `scene: [prototypeScene]`; then create `VirtualJoystick` with `(vector) => prototypeScene.setMovementVector(vector)`. In `onPauseChange`, call `joystick.setEnabled(!paused)` before `game.scene.pause('prototype')` or `game.scene.resume('prototype')`. Disabling the joystick emits neutral before the scene pauses; enabling it after Resume waits for a new touch. Register a one-shot `pagehide` handler that destroys the joystick, Phaser game, and HUD in that order, removing page-lifetime callbacks without creating new listeners during a scene restart.

```ts
let game: Phaser.Game | undefined;
let joystick: VirtualJoystick | undefined;
const hud = new GameHud(playSurface, {
  onPauseChange: (paused) => {
    if (!game || !joystick) return;
    joystick.setEnabled(!paused);
    if (paused) game.scene.pause('prototype');
    else game.scene.resume('prototype');
  },
});
const prototypeScene = new PrototypeScene((gold) => hud.setGold(gold));
game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 720,
  height: 1280,
  backgroundColor: '#25231e',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [prototypeScene],
});
joystick = new VirtualJoystick(
  playSurface,
  joystickElement,
  joystickKnob,
  window,
  (vector) => prototypeScene.setMovementVector(vector),
);
```

- [ ] **Step 6: Run the complete automated checks and production build**

Run: `npm test && npm run build`
Expected: every movement, combat, loot, joystick, HUD, and pause test passes; TypeScript and Vite finish with exit code 0.

- [ ] **Step 7: Commit and push Task 6 to `main`**

```bash
git add index.html src/ui/GameHud.ts src/main.ts tests/ui-controls.test.ts
git commit -m "feat: update Gold and pause gameplay"
git push origin main
```

### Task 7: Verify the deployed first-playable loop

**Files:**
- No planned code changes. Fix only concrete failures found by the checks above, with a regression test in the owning task.

**Interfaces:**
- Consumes the Stage 3 application at `https://haydenmay.github.io/Loot-Goblin-Browser/`.
- Produces verification evidence for local tests/build, Pages deployment, browser Pause/Resume behavior, and the user's phone check.

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test && npm run build && git diff --check`
Expected: all movement, combat, slime, coin, and UI tests pass; the production build and whitespace check exit 0. Also run `GITHUB_ACTIONS=true npm run build` and confirm generated asset URLs retain `/Loot-Goblin-Browser/`.

- [ ] **Step 2: Check the deployed browser build**

Open `https://haydenmay.github.io/Loot-Goblin-Browser/` in the connected browser. Confirm the HUD and room render, no page-origin console errors appear, Pause stops the scene and hides the joystick, keyboard Tab remains in the dialog, Escape resumes and focuses Pause, Resume restores a neutral input state, and Gold updates after loot arrives. Capture a screenshot of the available viewport.

- [ ] **Step 3: Perform the touch acceptance run after deployment**

On iPhone Safari, start touches from the center and near an edge, move the Goblin toward the slime, release, observe the automatic hammer loop, defeat the slime, and watch all three coins reach the sack while Gold changes from 0 to 3. Open Pause during movement and during coin travel; confirm the whole world freezes and resume waits for a fresh touch. Record any feel changes as tuning values rather than expanding the stage scope.

- [ ] **Step 4: Confirm the worktree and deployment are clean**

Check `git status --short --branch`, confirm `main` matches `origin/main`, and confirm the latest GitHub Pages workflow for the pushed commit completed successfully. Then stop and seek the user's manual approval before starting another stage.
