# Changelog

All notable changes to Argon are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

Each push to `main` publishes a build tagged `v<version>-<build>`, so one version can have
several builds. See [docs/release.md](docs/release.md).

## [Unreleased] (2.0)

On the `release/2.0` branch, not in a release yet.

### Added

- Real bit rate and sample rate in the KBPS and KHZ readouts, `--` when Music doesn't report
  them. They were fixed placeholders before. ([#22](https://github.com/ChristianTabor/Argon/pull/22))
- A Favorite heart in the display for the current track. Click it or press `F`. Themes can
  hide it with `--show-favorite: none`. ([#25](https://github.com/ChristianTabor/Argon/pull/25))
- A **PL** button in the bottom bar, and the `P` key, to show or hide the playlist in any
  theme. The choice is saved. Themes can remove the button with
  `--show-playlist-toggle: none`. ([#27](https://github.com/ChristianTabor/Argon/pull/27))
- Click the time display to switch between elapsed and remaining time. The choice is saved.
  ([#29](https://github.com/ChristianTabor/Argon/pull/29))
- Click the scrolling title to pause or resume it; Shift+click reverses it. ([#30](https://github.com/ChristianTabor/Argon/pull/30))
- Double-click the titlebar label to enter windowshade mode, and the windowshade bar's
  **ARGON** label to leave it. ([#26](https://github.com/ChristianTabor/Argon/pull/26))
- Hovering a theme card previews its colors. Clicking applies the theme. ([#28](https://github.com/ChristianTabor/Argon/pull/28))
- **Capture Media Keys** and **Global Shortcuts (Cmd+Shift)** checkboxes in the menu bar menu.
  The menu says when the media keys need Accessibility permission, or when another app holds a
  shortcut. ([#24](https://github.com/ChristianTabor/Argon/pull/24))
- A `LICENSE` file (MIT).
- Project docs: [docs/architecture.md](docs/architecture.md) (process model, IPC reference,
  AppleScript bridge, polling, prefs), [docs/release.md](docs/release.md),
  [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
- A test that keeps the IPC, prefs and shortcut tables in `docs/architecture.md` in step with
  the code.

### Changed

- The media keys are off for new installs; turn them on with **Capture Media Keys**. Existing
  installs keep them on. The `Cmd+Shift` shortcuts stay on by default. ([#24](https://github.com/ChristianTabor/Argon/pull/24))
- The visualizer follows playback: it settles flat and stops animating when paused or stopped,
  flutters while fast-forwarding or rewinding, and doesn't animate while the window is hidden.
  The visualizer mode is saved. ([#23](https://github.com/ChristianTabor/Argon/pull/23))
- Times of an hour or more show as `h:mm:ss`, in the player and the playlist.
- The theme guide moved from `THEME_GUIDE.md` to [docs/themes.md](docs/themes.md) and now
  covers categories, preview swatch rules, Album Adaptive and name clashes.

## [1.1.1] - 2026-10-26

### Fixed

- Downloaded builds no longer show as "damaged". Release builds are now ad-hoc signed, so
  macOS shows its usual "Apple could not verify" warning, and **Open Anyway** in System
  Settings → Privacy & Security opens Argon.

### Security

- The window refuses to navigate or open new windows, and ignores drops, so a dropped link or
  file can't replace Argon's page with one that gets the preload API.
- Theme install refuses zip names that resolve to the themes folder or its parent (such as
  `..zip`), which a failed install could delete, and zips that contain symlinks.

## [1.1.0] - 2026-10-25

Builds `v1.0.0-3` and `v1.1.0-4` have the same code. `v1.0.0-3` went out before the version
number was updated.

### Added

- Windowshade mode: a Winamp-style 28px bar with transport controls, a seek bar and the
  current track. Switch with the titlebar button or `Cmd+Shift+M`. Built by Morgan Tiley in
  [#2](https://github.com/ChristianTabor/Argon/pull/2).
- An Always on Top pin in the windowshade bar.
- An optional hidden Dock icon: uncheck **Show Dock Icon** in the menu bar menu. The choice is
  saved.

### Changed

- Clicking the menu bar icon brings Argon to the front and opens the menu. Right-click opens
  the menu without moving Argon.
- Saving prefs merges into the file, so keys written by the main process aren't lost.

### Fixed

- Closing the window no longer breaks the menu bar icon or `Cmd+Shift+M`; both bring a new
  window back.
- **Show Window** brings a buried or minimized window to the front.

## [1.0.0] - 2026-02-27

First release, as builds `v1.0.0-1` and `v1.0.0-2`. Build 2 renamed the built-in themes'
author from "WinAMP" to "Argon".

### Added

- A compact, always-on-top controller for the Music app, driven by AppleScript.
- 20 built-in themes and installable `.zip` themes, with an Album Adaptive theme that takes
  its colors from the album artwork.
- A mini mode, lyrics panel, 10-band EQ panel (visual only), playlist viewer and canvas
  visualizer.
- Global shortcuts and media keys, a menu bar menu, and track change notifications.
- Background transparency and a dark text mode.
- A GitHub Actions workflow that publishes a release on every push to `main`.

[Unreleased]: https://github.com/ChristianTabor/Argon/compare/v1.1.1-5...release/2.0
[1.1.1]: https://github.com/ChristianTabor/Argon/releases/tag/v1.1.1-5
[1.1.0]: https://github.com/ChristianTabor/Argon/releases/tag/v1.1.0-4
[1.0.0]: https://github.com/ChristianTabor/Argon/releases/tag/v1.0.0-2
