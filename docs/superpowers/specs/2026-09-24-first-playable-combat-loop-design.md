# Stage 3: First Playable Combat-and-Loot Loop

**Status:** Draft for user review
**Project:** Loot Goblin Browser
**Design reference:** Existing portrait-first play screen and floating touch joystick

## Approved direction

Stage 2 established the responsive dungeon view, minimal HUD, pause overlay, and hidden-until-touch joystick. Stage 3 makes the existing room playable as the first end-to-end slice of the original concept:

**Move the Goblin → release to stop → automatically hammer the slime → defeat it → coins pop out and collect into the sack → Gold increases.**

Keep the current placeholder shapes and one-room setup so this stage tests the control and reward loop. The user approved this direction in chat; this written spec is awaiting review.

## Selected approach

Build one cohesive first-playable slice with small, independently testable gameplay responsibilities. This connects movement, attacks, and pickup feedback in one useful phone test. The alternate split (movement first, combat and loot in a later stage) would reduce the amount of interacting code per release, but would delay testing the core loop the project was created to prove.

## User-facing behavior

### Movement

- A touch joystick activation anywhere on the play surface produces an analog movement vector for the active touch only. Its x/y components are bounded to `[-1, 1]` and preserve the joystick's direction and strength.
- The Goblin moves in that direction while joystick magnitude is outside the existing dead zone. Movement speed uses the vector magnitude and Phaser frame delta, capped at 50 ms for a single update to avoid large jumps after a stalled frame.
- Keep the Goblin's center inside the room's safe play bounds. Current crates, torches, and chest remain visual props and do not block movement.
- Pointer up, cancellation, pointer exit, or pausing clears movement immediately. The joystick hides according to its existing lifecycle.

### Stop-to-attack combat

- While the Goblin is moving, it does not start attacks. If movement resumes before the hammer impact, cancel that pending hit.
- When movement input returns to neutral, find the nearest living slime within melee range. Face it and attack automatically on a cooldown; resume searching if no living target is in range.
- Show a short wind-up and hammer swing using Phaser tweens on the existing placeholder actor. Apply damage at impact so a canceled swing cannot damage the slime.
- The one slime stays in place. Each impact makes it flash/recoil. After a small fixed number of hits, squash/fade it and remove it from targeting. No health bar is added.

### Coin pickup and Gold

- Slime death emits a small burst of simple coin shapes that pop outward and bounce briefly.
- After the pop, the coins magnetize toward the Goblin's sack and are collected automatically. Each coin can be collected only once.
- Update the existing Gold value in the DOM HUD as coins arrive. The level/progress display remains a placeholder for this stage.

### Pause and resume

- Pause freezes movement, attacks, slime reactions, coin motion, and collection.
- Opening Pause clears active movement and hides/invalidates the joystick gesture so it cannot leave stale input. Resume returns to a neutral, idle state and waits for a fresh touch.
- Keep keyboard focus inside the pause dialog, allow Escape to resume, and return focus to Pause after resuming. This resolves the keyboard focus issue noted during Stage 2 review.

## Component responsibilities and data flow

- `VirtualJoystick` continues to own touch discovery, pointer tracking, visual placement, dead-zone handling, and release/cancel behavior. Add a small direction-change callback that reports bounded analog vector components and reports neutral input on gesture end or disable.
- `main.ts` wires the input callback to the run scene and wires pause state and Gold updates across the DOM/Phaser boundary. It owns the integration, not gameplay rules.
- `PrototypeScene` owns the active run state: movement, target selection, attack timing, slime health/reaction/death, coin animation/collection, and Phaser object cleanup.
- `GameHud` stays DOM-only. It adds a Gold update method and pause-state callback; it does not import Phaser.
- Keep movement math and target/range/timing rules in small pure helpers or state objects where useful, so tests can exercise them without rendering Phaser.

The state flow is: joystick vector → scene movement; neutral vector → target search and auto-attack; impact → slime damage; slime death → coin burst; coin pickup → Gold update.

## Initial tuning values

Treat values as named constants that can be adjusted after the phone test:

- Goblin movement speed: about 220 logical pixels per second.
- Melee range: about 100 logical pixels from actor center to target center.
- Hammer wind-up: about 180 ms; repeat interval: about 750 ms.
- Slime health: 3 impacts.
- Loot: 3 coins worth 1 Gold each.
- Coin pop: about 300 ms before magnet movement begins.

These are starting values for the first build. Success depends on the control loop being readable and responsive on a phone; tuning may change them without changing the scope.

## Scope boundaries

This stage does not add enemy AI or attacks, more enemies, obstacle collision, room transitions, procedural rooms, doors, inventory or sack capacity, equipment, upgrades, save data, additional currencies, audio, final character art, PWA installation, accounts, or monetization. It does not connect the old Unity prototype to this browser project.

## Failure handling and state cleanup

- Treat pointer up, cancel, capture loss, pointer exit, pause, and scene shutdown as neutral movement input.
- Clamp movement after applying the frame step so the Goblin cannot leave the room, including after viewport resize.
- Do not apply damage after a swing was interrupted before impact.
- Mark a slime dead before starting its death tween so a later update cannot select it or create duplicate drops.
- Track each coin's collection state and destroy it after collection so Gold increments exactly once.
- On scene shutdown, remove joystick, scene, and HUD callbacks/listeners to avoid duplicate input after a restart.

## Verification and acceptance

1. `npm test` covers joystick-vector conversion and reset paths, analog direction strength, bounded frame-delta movement, movement suppressing attacks, attack resumption after stopping, target range/selection, canceled wind-up, slime death exactly once, coin pickup exactly once, Gold updates, and pause/resume cleanup.
2. `npm run build` succeeds without adding runtime dependencies. The GitHub Pages `/Loot-Goblin-Browser/` base remains intact.
3. Browser verification confirms the play screen still fills the viewport; Pause freezes gameplay and Resume restarts from idle; no application console errors appear.
4. Touch verification starts at center and near screen edges, moves the Goblin, releases near the slime, observes automatic hammer hits, defeats the slime, and sees the Gold count increase as coins reach the sack.
5. The deployed Pages build is checked after push. The user confirms the actual touch feel on iPhone Safari because the available Cloud Browser has no real iPhone touch surface.

## Visual style

Use Phaser shapes, colors, and tweens already consistent with Stage 2. Keep the play screen free of health bars and extra controls. The Goblin's motion, hammer swing, slime reaction, and coin movement provide the feedback for this prototype; art replacement and broader polish stay for later work.
