## Setup

```
npm install
```

## Scripts

- `npm run dev` - esbuild watch, writes `main.js` with inline sourcemaps. Use with the Hot Reload plugin in a vault.
- `npm run build` - `tsc -noEmit -skipLibCheck` typecheck, then production bundle to `main.js`.
- `npm test` - jest (jsdom). Single test: `npx jest -t "<test name>"`.

`main.js` is build output and is gitignored.

## Release

- `npm version <patch|minor|major>` syncs `manifest.json` and `versions.json` via `version-bump.mjs`. It also creates a git tag by default.
- Pushing a tag runs `.github/workflows/release.yml`, which builds and creates a draft GitHub release with `main.js`, `manifest.json` and `styles.css`. Publish the draft on GitHub.

## Bookmarklet

Edit `src/bookmarklet.js`. Tests are in `src/__tests__/bookmarket.test.js` (the file name is spelled that way in the repo).
Serialize to url encoded bookmarklet text with `npm run bookmarklet`, which requires [bun](https://bun.sh).
Copy into dist/index.html and preview with `npm run bookmarklet-page` (uses macOS `open`).
