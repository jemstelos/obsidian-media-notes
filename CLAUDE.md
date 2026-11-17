# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Obsidian plugin (id `media-notes`, desktop-only) that embeds a YouTube player in any markdown note whose frontmatter has `media_link` (or legacy `media`). Provides playback hotkeys, timestamp insertion, clickable `HH:MM:SS` timestamp links, and resume-from-last-position. UI is React 18 rendered into Obsidian's DOM.

This checkout lives inside a real vault (`.obsidian/plugins/obsidian-media-notes`) and has a `.hotreload` file, so the Hot Reload plugin reloads it whenever `main.js` changes — `npm run dev` gives live testing in that vault.

## Commands

- `npm run dev` — esbuild watch, writes `main.js` (inline sourcemaps)
- `npm run build` — `tsc -noEmit -skipLibCheck` typecheck, then production bundle
- `npm test` — jest (jsdom env); single test: `npx jest -t "<test name>"` or `npx jest src/__tests__/bookmarket.test.js`
- `npm run bookmarklet` — serialize `src/bookmarklet.js` into a `javascript:` URL (requires **bun**); paste into `dist/index.html`, preview with `npm run bookmarklet-page`
- `npm version <patch|minor|major>` — runs `version-bump.mjs` to sync `manifest.json` and `versions.json`

Release: pushing a git tag triggers `.github/workflows/release.yml`, which builds and creates a draft GitHub release with `main.js`, `manifest.json`, `styles.css`. `main.js` is gitignored.

## Architecture

- `src/main.tsx` — `MediaNotesPlugin`. Holds `players: { [playerId]: { ytRef, mediaLink, eventEmitter, root } }`, where `root` is the React root. `renderPlayerInView` parses the view's frontmatter, creates a `.media-notes-container` div with a random `data-player-id`, prepends it to `.markdown-source-view`, and mounts `AppProvider` + `MediaFrame` via `createRoot`. Players are looked up from a view by querying that container and reading `data-player-id` (`getActiveViewYoutubePlayer`). `layout-change` renders all markdown leaves; `metadataCache` `changed` renders only the views of the changed file. If the link is unchanged the existing player is kept; otherwise `destroyPlayer` saves its timestamp, unmounts `root` and removes the container. `removePlayerFromView` does the same cleanup when `media_link` is missing or invalid.
- Commands (insert timestamp, play/pause, seek, speed, split toggle) call the YouTube iframe API through `ytRef.current.internalPlayer`, then `eventEmitter.emit("handleAction", {type})` so the React overlay can show feedback.
- Resume position: `savePlayerTimestamp` stores `lastTimestampSeconds` in `settings.mediaData` keyed by video id (from `getVideoId`), persisted in plugin `data.json`. On render, saved position wins over the URL `t=` param; autoplay only when starting from `t=`.
- Split layout: vertical vs horizontal is toggled by the `media-container-parent-vertical` class on the view container plus inline width/height from settings; styles in `styles.css`.
- `src/app-context.tsx` — React context bridging plugin settings and the per-player `EventEmitter` (`settingsUpdated`, `handleAction`) into components.
- `src/components/media-frame.tsx` — `MediaFrame` (react-youtube player, progress bar, overlays) and `getVideoId` (accepts `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` and `/live/` URLs).
- `src/viewPlugin.ts` — CodeMirror 6 `ViewPlugin` registered as editor extension; intercepts clicks on `span.cm-link` whose text matches a timestamp regex and calls `handleTimestampClick` to seek.
- `src/bookmarklet.js` — standalone browser bookmarklet that builds an `obsidian://` URI to create a media note from a YouTube page. Code after the `// --- exports ---` marker exists only for jest and is stripped by `convert-bookmarklet.ts`.

esbuild uses classic JSX (`React.createElement`), so `.tsx` files must `import * as React from "react"`. `obsidian`, `electron`, and `@codemirror/*` are externals provided by Obsidian at runtime.
