# Contributing to Argon

Thanks for helping. This page covers setup, tests, how PRs work, and the two changes that are
easy to get wrong: adding an IPC channel and adding a pref.

For how the app fits together, read [docs/architecture.md](docs/architecture.md). For themes,
read [docs/themes.md](docs/themes.md).

## Requirements

- macOS. Argon controls the Music app through AppleScript, so it only runs on a Mac.
- The Music app, with something in your library to play.
- Node.js, current LTS release. The release workflow builds with Node 20.

## Setup

```bash
git clone https://github.com/ChristianTabor/Argon.git
cd Argon
npm install
npm start
```

`npm run dev` does the same as `npm start` and also opens DevTools in a detached window.

Don't run `npm run build` unless you mean to. It regenerates the committed icon files in
`assets/`, then deletes and replaces `Argon.app` and `Argon Glass.app` in `/Applications`.
See [docs/release.md](docs/release.md#building-locally).

## The Automation permission

Argon needs macOS's permission to control Music. Without it every AppleScript call fails and
Argon just shows "Open Apple Music to begin".

When you run from source, macOS asks on behalf of the app that started Electron, not "Argon".
From Terminal the prompt says "Terminal" wants to control "Music"; from iTerm or VS Code it
names those. Allow it.

If you denied it, turn it back on in System Settings → Privacy & Security → Automation, under
your terminal or editor. Or reset that app's decisions and relaunch it:

```bash
tccutil reset AppleEvents com.apple.Terminal   # Terminal
tccutil reset AppleEvents com.googlecode.iterm2 # iTerm
tccutil reset AppleEvents com.microsoft.VSCode  # VS Code
```

`tccutil reset` clears every Automation decision for that app, not just Music.

The packaged app asks as "Argon" (bundle id `com.tabor.argon`).

Your source checkout and the installed app share the same prefs and user themes in
`~/Library/Application Support/argon/`.

## Tests

```bash
npm test
```

Jest runs everything in `test/`:

| File | Covers |
|------|--------|
| `test/main.test.js` | `main.js` with Electron mocked: IPC registration, input validation, tray, shortcut groups, prefs, Dock icon, the navigation guard, theme install checks. |
| `test/preload.test.js` | `preload.js`: every `window.api` method calls the right channel. |
| `test/renderer.test.js` | `index.html`, `app.js`, `theme-manager.js` and `base.css`, mostly by reading the source text. Runs `favorite.js` and `playlist-layout.js` directly, and some of `app.js` through `test/helpers/appHarness.js`. Also checks some README wording. |
| `test/theme-preview.test.js` | Theme hover preview in `theme-manager.js`, against small DOM mocks with fake timers. |
| `test/visualizer.test.js` | The visualizer's playback states and idling, against small DOM mocks. |
| `test/docs.test.js` | The IPC, prefs and shortcut groups tables in `docs/architecture.md` match the code. |

The tests don't talk to Music, so they pass on any Mac and don't need the Automation
permission.

There's no linter and no CI on pull requests yet. The release workflow runs `npm test` on
every push to `main` and doesn't publish if it fails. CI for pull requests is planned in
[#3](https://github.com/ChristianTabor/Argon/issues/3).

## Branches and pull requests

- Branch from `main`. Name the branch for the kind of change: `feature/…`, `fix/…`, `docs/…`
  or `chore/…`.
- Keep a PR to one change, and run `npm test` before you push.
- In the PR, say what changed and how you checked it in the app.
- Every merge to `main` publishes a release (see [docs/release.md](docs/release.md)), so
  `main` should always be shippable. A maintainer may ask you to target a release branch, such
  as `release/2.0`, instead.

### Labels

Maintainers label issues and PRs. The labels are:

- **Type:** `bug`, `enhancement`, `documentation`, `chore`, `testing`.
- **Area:** `area: player-ui`, `area: windowing`, `area: themes`, `area: visualizer`,
  `area: apple-music`, `area: shortcuts`, `area: build-release`, `area: repo`.
- **Priority:** `priority: high`, `priority: medium`, `priority: low`.
- **Effort:** `effort: small` (about a day), `effort: medium` (a few days),
  `effort: large` (a week or more).
- **Other:** `good first issue`, `help wanted`, `community-idea`, `winamp-parity`,
  `distribution`, `security`, plus GitHub's `duplicate`, `invalid`, `question` and `wontfix`.

`good first issue` is the place to start.

## Adding an IPC channel

The renderer is sandboxed and can only reach the main process through `window.api`. Every
channel is part of the security boundary.

1. **Handle it in `main.js`.** Add an `ipcMain.handle('<area>:<name>', …)` in the matching
   section (`music:`, `themes:`, `window:` and so on).
2. **Validate every argument.** Check the type and the range, and return early if it's wrong.
   Look at `music:setVolume` and `themes:load` for the pattern. Never put a string from the
   renderer into an AppleScript's source or a file path; convert to a number first, or check
   it against a fixed list. If a script needs a string, check its format and pass it to
   `runAppleScript(script, [value])`, which hands it to the script's `on run argv`, as
   `music:toggleFavorite` does.
3. **Expose it in `preload.js`.** Add one method that calls `ipcRenderer.invoke` with the
   channel. Don't expose `ipcRenderer` itself. For events from main, wrap the callback so the
   IPC event object doesn't reach the page, as `onToggleMiniMode` does.
4. **Document it.** Add a row to the IPC table in
   [docs/architecture.md](docs/architecture.md#ipc-channel-reference) with the arguments,
   validation and return value. `test/docs.test.js` fails until you do.
5. **Test it.** Add cases to `test/main.test.js` (the handlers are captured in `ipcHandlers`)
   and `test/preload.test.js`, including the inputs your validation rejects.

## Adding a pref

1. Add the key and its `typeof` type to `allowed` in the `prefs:save` handler in `main.js`.
   **If you skip this, `prefs:save` drops the key without an error.**
2. Save it. `prefs:save` merges, so `prefs.save({ key: value })` is enough, as the visualizer
   mode and the PL button do. Most older code sends the whole object from `prefs.load()`
   instead; both work.
3. Read it at startup where it's used, and handle it being missing (old prefs files won't
   have it).
4. Add a row to the prefs table in [docs/architecture.md](docs/architecture.md#prefs).
   `test/docs.test.js` checks that every key in `allowed` is listed.

## Reporting security issues

Don't open a public issue. See [SECURITY.md](SECURITY.md).
