# Stage 2: Responsive Play Screen Foundation

**Status:** Draft for review
**Project:** Loot Goblin Browser
**Design reference:** portrait-first 720 × 1280 logical viewport

## Intent

Replace the current centered landscape title with a full-screen play view that reads clearly on a phone and adapts to desktop. Establish one viewport and HUD contract that later movement, combat, and loot work can build on without redoing screen layout.

The generated phone and desktop mockups shared in the conversation are visual direction only. They are not production assets. The Stage 2 implementation uses simple Phaser shapes so viewport and HUD behavior can be verified before art work begins.

## User-facing design

- A full-width, top-down dungeon play area fills the browser viewport.
- The top HUD contains only Pause, Level/progress, and Gold. Level and gold values are placeholders in this stage.
- Touch devices have no visible joystick while idle. On any touch that begins on the play surface, a subtle floating analog joystick appears centered at that touch point and follows that finger until release or cancellation. The Pause control and any open pause overlay keep their normal UI taps. Stage 2 shows joystick direction but does not move the Goblin.
- Fine-pointer desktop use hides the touch joystick. Touch input remains available on hybrid devices with a mouse and touchscreen.
- Pause opens a minimal overlay with Resume. No settings, inventory, or other menu screens are part of this stage.
- Do not add health bars, a minimap, ability buttons, weapon shortcuts, or a sack counter.

## Viewport and rendering contract

- Use 720 × 1280 as the portrait reference size.
- Use Phaser 4.2.1 `Phaser.Scale.EXPAND` so the canvas fills its parent while keeping the reference content at a uniform scale. On narrow/tall screens, more world height becomes visible; on wide screens, more world width becomes visible. Do not stretch objects or letterbox the play area.
- The game host fills the available viewport, including dynamic viewport sizing on mobile. Add `viewport-fit=cover` and apply CSS safe-area insets to DOM HUD elements.
- Handle resize and orientation changes through one scene layout path. Keep the room background covering the expanded logical view, and keep the Goblin and slime in the readable playable area.
- Phaser owns the game world. HTML/CSS owns the HUD and floating joystick presentation so it can respect safe areas and remain independent of camera coordinates. The joystick belongs to the viewport-level play surface, not a fixed corner or camera position.

## Stage 2 world

Render a simple tiled dungeon floor, a flat green Goblin marker with a gray hammer shape, and a green slime marker. These objects are static composition aids. They must be large and separated enough to inspect phone readability and HUD overlap.

No character movement, collisions, enemy behavior, attacks, damage, death, drops, pickup, fake height, particles, or final artwork are implemented in Stage 2.

### Floating touch joystick

- Keep the joystick fully hidden when there is no active touch.
- A touch beginning anywhere on the play surface starts the joystick at that exact point. Interactive UI targets such as Pause are reserved for their own actions and do not start the joystick; informational HUD regions remain part of the touch surface.
- Track the initiating pointer only. Render a base at the touch origin and a knob that follows the finger. Clamp the knob to the joystick radius while preserving the finger's direction when it moves beyond that radius.
- Use a small, smooth dead zone around the origin so tiny thumb drift does not produce a full-strength direction. The control must respond from the full play surface, including near edges; do not require the user to find a fixed activation zone.
- End the active joystick on pointer up or cancellation, including when the finger leaves the screen, and fade it out. Use pointer capture (or an equivalent robust pointer lifecycle) so it cannot remain stuck onscreen.
- Disable browser panning/scrolling gestures on the play surface while preserving normal taps on interactive HUD controls.
- Stage 2 only renders and verifies this touch response. It does not send joystick direction to the Goblin or implement movement.

## Implementation boundaries

- `index.html`: mobile viewport metadata and app host.
- `src/main.ts`: create and configure the Phaser game.
- `src/game/PrototypeScene.ts`: responsive static room and placeholder actors.
- `src/ui/GameHud.ts`: accessible HUD and minimal pause/resume behavior.
- `src/ui/VirtualJoystick.ts`: floating touch lifecycle and direction feedback, without gameplay movement.
- `src/style.css`: full-viewport layout, safe areas, HUD placement, and hidden-by-default joystick styling for touch-capable input.
- `vite.config.ts` and `.github/workflows/deploy.yml`: preserve the working GitHub Pages deployment configuration unless verification finds a concrete defect.

Do not add a framework or new runtime dependency for this stage.

## Deployment route

The confirmed Pages route for this repository is <https://haydenmay.github.io/Loot-Goblin-Browser/>. The similarly named `/Loot-Goblin-Prototype/` route returned 404 during verification. Preserve the existing `/Loot-Goblin-Browser/` Vite base and verify that production asset URLs use that prefix.

## Verification and acceptance

1. `npm run build` completes successfully.
2. The development server and production preview render the same play screen with no console errors or missing assets.
3. Use Playwright screenshots where available at representative portrait phone (390 × 844), landscape phone (844 × 390), portrait tablet (768 × 1024), and desktop (1365 × 768) sizes.
4. At every size, the canvas fills the game host, the world scale is uniform, no HUD element is clipped, and no horizontal page overflow appears.
5. Portrait phone view keeps Pause, Level/progress, and Gold inside their safe areas. The joystick is absent at rest; on touch it appears at the finger location from left, center, right, and near-edge play-surface points, then follows that finger within its radius. Fine-pointer desktop hides the touch joystick, while hybrid devices can still activate it by touch.
6. Rotating/resizing updates the viewport without stretching the actors or leaving uncovered background.
7. Pause opens the overlay and Resume returns to the play view.
8. Verify the dead zone and clamped knob direction are forgiving, pointer up/cancel hides the joystick even after the finger exits the play area, and touching Pause still opens the pause overlay without showing a joystick. Confirm that joystick input does not move the Goblin in this stage.
9. Test the deployed build at the confirmed Pages route; check network requests for the correct `/Loot-Goblin-Browser/` asset prefix. Make a final visual check in iPhone Safari after deployment.

If Playwright is unavailable in the environment, do not add a dependency solely for screenshots; use the production preview and a browser screenshot check, then complete the real-phone check after deployment.

## Later-stage compatibility

The viewport contract must leave room for the next gameplay work: one-thumb movement, movement suppressing attacks, and auto-melee resuming after release. This stage does not implement those mechanics. The Unity project remains a separate design/reference prototype.
