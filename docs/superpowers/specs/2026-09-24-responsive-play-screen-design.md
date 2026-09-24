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
- Touch devices show a subtle floating analog joystick in the lower-left safe area. The mockup shows its active visual state; Stage 2 does not move the Goblin from joystick input.
- Desktop uses the available width and hides the touch joystick when the primary pointer is not coarse.
- Pause opens a minimal overlay with Resume. No settings, inventory, or other menu screens are part of this stage.
- Do not add health bars, a minimap, ability buttons, weapon shortcuts, or a sack counter.

## Viewport and rendering contract

- Use 720 × 1280 as the portrait reference size.
- Use Phaser 4.2.1 `Phaser.Scale.EXPAND` so the canvas fills its parent while keeping the reference content at a uniform scale. On narrow/tall screens, more world height becomes visible; on wide screens, more world width becomes visible. Do not stretch objects or letterbox the play area.
- The game host fills the available viewport, including dynamic viewport sizing on mobile. Add `viewport-fit=cover` and apply CSS safe-area insets to DOM HUD elements.
- Handle resize and orientation changes through one scene layout path. Keep the room background covering the expanded logical view, and keep the Goblin and slime in the readable playable area.
- Phaser owns the game world. HTML/CSS owns the HUD and joystick presentation so it can respect safe areas and remain independent of camera coordinates.

## Stage 2 world

Render a simple tiled dungeon floor, a flat green Goblin marker with a gray hammer shape, and a green slime marker. These objects are static composition aids. They must be large and separated enough to inspect phone readability and HUD overlap.

No character movement, collisions, enemy behavior, attacks, damage, death, drops, pickup, fake height, particles, or final artwork are implemented in Stage 2.

The joystick visual establishes a future touch-control position only. The later movement stage can implement the previously accepted floating-stick behavior: broad lower-left activation area, thumb-relative appearance, a dead zone, forgiving recentering, and fade on release.

## Implementation boundaries

- `index.html`: mobile viewport metadata and app host.
- `src/main.ts`: create and configure the Phaser game.
- `src/game/PrototypeScene.ts`: responsive static room and placeholder actors.
- `src/ui/GameHud.ts`: accessible HUD and minimal pause/resume behavior.
- `src/style.css`: full-viewport layout, safe areas, HUD placement, and coarse-pointer joystick visibility.
- `vite.config.ts` and `.github/workflows/deploy.yml`: preserve the working GitHub Pages deployment configuration unless verification finds a concrete defect.

Do not add a framework or new runtime dependency for this stage.

## Deployment route

The confirmed Pages route for this repository is <https://haydenmay.github.io/Loot-Goblin-Browser/>. The similarly named `/Loot-Goblin-Prototype/` route returned 404 during verification. Preserve the existing `/Loot-Goblin-Browser/` Vite base and verify that production asset URLs use that prefix.

## Verification and acceptance

1. `npm run build` completes successfully.
2. The development server and production preview render the same play screen with no console errors or missing assets.
3. Use Playwright screenshots where available at representative portrait phone (390 × 844), landscape phone (844 × 390), portrait tablet (768 × 1024), and desktop (1365 × 768) sizes.
4. At every size, the canvas fills the game host, the world scale is uniform, no HUD element is clipped, and no horizontal page overflow appears.
5. Portrait phone view keeps Pause, Level/progress, Gold, and the joystick inside their safe areas. Wide view reveals more room horizontally and hides the touch joystick for a fine pointer.
6. Rotating/resizing updates the viewport without stretching the actors or leaving uncovered background.
7. Pause opens the overlay and Resume returns to the play view.
8. Test the deployed build at the confirmed Pages route; check network requests for the correct `/Loot-Goblin-Browser/` asset prefix. Make a final visual check in iPhone Safari after deployment.

If Playwright is unavailable in the environment, do not add a dependency solely for screenshots; use the production preview and a browser screenshot check, then complete the real-phone check after deployment.

## Later-stage compatibility

The viewport contract must leave room for the next gameplay work: one-thumb movement, movement suppressing attacks, and auto-melee resuming after release. This stage does not implement those mechanics. The Unity project remains a separate design/reference prototype.
