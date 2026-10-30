# Argon test plan: windowshade mode (PR #2)

> Automated: `npm test` (Jest, 3 suites) in `~/.worktrees/argon/windowshade-fixes`, run 2026-10-25 16:01, 168 passed. Each ticked item names its test.
> Main-process tests run main.js against a mocked Electron. Renderer tests (sections 1 to 3) check the source text, so how the bar behaves in a real window is on Christian's list.
> Christian's list: [../argon-you.md](../argon-you.md)
> Covers Morgan's PR https://github.com/ChristianTabor/Argon/pull/2 (head d9c9924) plus our 4 fixup commits, merged to main through https://github.com/ChristianTabor/Argon/pull/20 (merge commit caa01a8). GitHub marked #2 as merged.
> Known and left for 2.0: the Dock icon flashes at launch when hidden; leaving windowshade resets the window to its default size; Classic cuts off its bottom bar in normal mode.

## 1. Windowshade bar

- [x] **Asks for a 320×28 window, 280–600 wide, height fixed** — "enterMiniMode applies correct window constraints for mini strip"
- [x] **280 wide fits every fixed item** — "minimum width fits every fixed item, so nothing clips"
- [x] **Hides the main sections** — "mini mode hides all main sections"
- [x] **Shows "Track — Artist" on one line** — "updateMiniPlayerUI shows track and artist on one line"
- [x] **Leaving restores the normal window limits** — "exitMiniMode restores normal constraints"
- [x] **Survives a restart** — "mini mode is persisted to prefs", "mini mode is restored from prefs on startup"
- [x] **Cmd+Shift+M toggles it** — "registers mini mode shortcut", "mini mode shortcut sends IPC to renderer", "listens for IPC toggle-mini-mode event"
- [x] **The text says Windowshade** (tooltip, exit button, README) — "user-facing text calls it Windowshade"

## 2. Seek bar

- [x] **Uses the theme's bar colors** — "seek bar uses the theme bar colors"
- [x] **Has a taller click area outside the drag region** — "seek bar has a larger click area that stays out of the drag region"
- [x] **A click restarts the fill animation from the new spot** — "seek click restarts the local seek animation from the new position"

## 3. Window buttons in the bar

- [x] **Has a pin button** — "has a pin button among the window buttons"
- [x] **The pin toggles always-on-top like the titlebar pin, and both light up together** — "pin uses the same always-on-top toggle as the titlebar pin", "pin shows the same active state as the titlebar pin"
- [x] **Close's red hover is tied to its class** — "close hover is tied to a class, not to the button position"

## 4. Dock icon (opt-in)

- [x] **Shown by default** — "is not hidden by default", "hideDockIcon defaults to false and is whitelisted as a boolean"
- [x] **Tray → Show Dock Icon hides and shows it at once, saves the pref and rebuilds the menu** — "tray menu item hides and shows it live, saves the pref and rebuilds the menu"
- [x] **Hiding it doesn't pull focus to a window that didn't have it** — "hiding it does not pull focus to a window that did not have it"
- [x] **With the pref on, it's hidden before the window is created** — "hides the Dock icon before the window is created"
- [ ] **No Dock flash at launch when hidden**
  > Not fixed: the icon shows for a moment at launch. A clean fix needs LSUIElement in the packaged Info.plist; left for 2.0.

## 5. Closed window and tray

- [x] **Tray click brings back a closed window** — "tray click recreates a destroyed window"
- [x] **Tray → Show Window brings it back** — "Show Window recreates a destroyed window"
- [x] **The Dock icon brings it back** — "activate recreates the window once it has been closed"
- [x] **Cmd+Shift+M brings it back instead of throwing** — "Cmd+Shift+M recreates a destroyed window instead of throwing"
- [x] **The tray offers Show Window once it's closed** — "the tray menu offers Show Window once the window is closed"
- [x] **The Show/Hide label follows the window** — "the Show/Hide Window label follows the window being hidden and shown"

## 5b. Window behind other windows

- [x] **The menu says Show Window once the window loses focus, and Hide Window when it gets it back** — "the menu offers Show Window once the window loses focus, and Hide Window when it gets it back"
- [x] **Show Window takes focus and brings a buried window to the front** — "Show Window brings a buried window to the front instead of hiding it"
- [x] **Clicking the icon brings the window up and always opens the menu**, labeled Hide Window — "clicking the icon brings the window up and always opens the menu"
- [x] **Right-click and Control-click open the menu without moving the window** — "right-click and Control-click open the menu without moving the window"
- [x] **The menu is not attached to clicks** (macOS would open it on every click) — "tray builds its menu but does not attach it to clicks"
- [x] **Show Window restores a minimized window** — "Show Window restores a minimized window"
- [x] **A window pinned always on top counts as in front, and pinning updates the menu** — "a window pinned always on top counts as in front, and pinning updates the menu"
  > The focus tests fail against the old tray code, and the 3 click tests fail against the committed tray code (checked 2026-10-25 16:01). Real window ordering is on Christian's list.

## 6. Prefs

- [x] **Saving from the window keeps keys only the main process writes**, like hideDockIcon — "prefs:save merges into saved prefs instead of clobbering main-process keys"
- [x] **Unknown keys are still dropped** — "prefs:save strips unknown keys"

## 7. Repo

- [x] **App icons match main's** (Morgan's PR had changed both .icns) — `git diff --quiet 7880c49 -- assets/`, 2026-10-25 13:52
- [x] **todo.md is gone** (its ideas are filed as issues) — `test ! -e todo.md`, 2026-10-25 13:52
- [x] **README describes windowshade mode and the Show Dock Icon option** — "describes all 6 new features", plus `grep`, 2026-10-25 13:52
- [x] **Each of the 3 commits passes on its own** — b9796cf 150, 914b5a7 167, 62f8546 167 tests, run 2026-10-25 15:54 (Morgan's d9c9924: 4 failed, 136 passed)
- [x] **The tray-click commit passes on its own** — 5d87c48, 168 tests, run 2026-10-25 16:04

## 8. After the merge

- [x] **The Release workflow passes** and publishes `v1.0.0-<run>` with the arm64 and x64 zips — v1.0.0-3, https://github.com/ChristianTabor/Argon/actions/runs/40243833880 (tests passed in CI), 2026-10-25 23:15 UTC
- [ ] **1.1.0 publishes** after #21 bumped the version
  > Running for 1ca6abd: https://github.com/ChristianTabor/Argon/actions/runs/40257051700
