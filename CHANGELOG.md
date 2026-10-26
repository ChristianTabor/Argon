# Changelog

All notable changes to Argon are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

Each push to `main` publishes a build tagged `v<version>-<build>`, so one version can have
several builds. See [docs/release.md](docs/release.md).

## [Unreleased]

### Added

- A `LICENSE` file (MIT).
- Project docs: [docs/architecture.md](docs/architecture.md) (process model, IPC reference,
  AppleScript bridge, polling, prefs), [docs/release.md](docs/release.md),
  [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
- A test that keeps the IPC and prefs tables in `docs/architecture.md` in step with the code.

### Changed

- The theme guide moved from `THEME_GUIDE.md` to [docs/themes.md](docs/themes.md) and now
  covers categories, preview swatch rules, Album Adaptive and name clashes.

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

[Unreleased]: https://github.com/ChristianTabor/Argon/compare/v1.1.0-4...HEAD
[1.1.0]: https://github.com/ChristianTabor/Argon/releases/tag/v1.1.0-4
[1.0.0]: https://github.com/ChristianTabor/Argon/releases/tag/v1.0.0-2
