# Loot Goblin Web Prototype

A fresh browser-first implementation of Loot Goblin. The Unity project remains a separate design and reference prototype.

## Project goals

- Make the game quick to load and simple to test across desktop and mobile browsers.
- Use a clear top-down view with a compact, touch-friendly interface.
- Create expressive characters and combat using browser-friendly rendering.
- Build the project incrementally, starting with a small playable foundation.

## Status

The browser foundation is in place with Vite, TypeScript, and Phaser. Gameplay systems and controls will be added incrementally.

## Run locally

```sh
npm ci
npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

## GitHub Pages

Pushing to `main` builds the Vite app and deploys the `dist/` folder to GitHub Pages. The workflow can also be started manually from the Actions tab.
