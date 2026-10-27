# Argon

Argon is a Winamp-inspired, always-on-top **controller for the Music app on macOS**. It doesn't
play audio itself; it controls Music through AppleScript.

It's a compact, themeable window with a visualizer, playlist view, lyrics, a Winamp-style
windowshade bar and a menu bar menu. It's built with Electron.

[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
![macOS](https://img.shields.io/badge/macOS-10.15+-000?logo=apple&logoColor=white)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

<p>
  <img src="docs/images/player-classic.png" width="260" alt="Argon with the Classic Winamp theme, playing a track with album art">
  <img src="docs/images/theme-terminal-green.png" width="260" alt="Argon with the Terminal Green theme, showing the playlist">
  <img src="docs/images/theme-album-adaptive.png" width="260" alt="Argon with the Album Adaptive theme, colored from the album art">
</p>

<img src="docs/images/windowshade.png" width="460" alt="Argon in windowshade mode: a one-line bar with transport controls, a seek bar and the track name">

The screenshots use made-up tracks.

## Features

- **Winamp-style UI** — Compact player with visualizer, seek bar, volume, shuffle/repeat
- **Live Display** — The track's real bit rate and sample rate in the KBPS and KHZ readouts (`--` when Music doesn't report them). Click the time to switch between elapsed and remaining. Click the scrolling title to pause it; Shift+click reverses it.
- **Favorite** — A heart in the display marks the current track as a favorite in Music. Click it or press `F`.
- **Theme Engine** — 20 built-in themes, user-installable .zip themes, per-theme layout control. Hover a theme card to preview its colors; click to apply it.
- **Adaptive Theme** — Takes its colors from the album art, adjusted for readable contrast
- **Windowshade Mode** — Winamp-style 320×28 bar (resizable 280–600px wide) with transport controls, a seek bar, and the current track. Double-click the title to enter it, and the bar's **ARGON** label to leave it.
- **Lyrics Display** — Shows the lyrics stored with the track in Music
- **Equalizer Panel** — 10 bands and 10 presets (Rock, Pop, Jazz, Classical, etc.). Visual only for now: it saves your settings but doesn't change the sound. See [Limitations](#limitations).
- **Global Shortcuts** — Optional `Cmd+Shift` hotkeys (on by default) and media keys (off by default) that work system-wide. Turn either on or off in the menu bar menu. See [Global Shortcuts](#global-shortcuts-system-wide).
- **Menu Bar / Tray** — Click the menu bar icon to bring Argon to the front and open its menu; right-click opens the menu without moving Argon. See [The menu bar menu](#the-menu-bar-menu).
- **Hide Dock Icon** — Optional: uncheck **Show Dock Icon** in the tray menu to keep Argon out of the Dock
- **Track Notifications** — Native macOS notifications on track change
- **Background Transparency** — Adjustable background opacity
- **Dark/Light Text Mode** — Toggle text polarity for any background
- **Playlist Viewer** — Up to 30 tracks around the current one in the playing playlist, click to play. Themes with a playlist layout (Terminal Green, Overdrive, Blood Moon) show it by default; the **PL** button in the bottom bar or `P` shows or hides it in any theme, and Argon remembers your choice.
- **Window Snap** — Snap to bottom-right corner, lock position, always-on-top
- **Visualizer** — Three modes (bars, waveform, spectrum) with theme-aware colors. It follows playback and rests when paused, and Argon remembers the mode. It's animated, not driven by the audio; see [Limitations](#limitations).

<p>
  <img src="docs/images/panel-themes.png" width="260" alt="The Themes panel with category tabs and theme cards">
  <img src="docs/images/panel-lyrics.png" width="260" alt="The Lyrics panel">
  <img src="docs/images/panel-eq.png" width="260" alt="The Equalizer panel with the Rock preset">
</p>

## Install

Argon needs:

- **macOS** 10.15 or later (Electron 28's minimum).
- **The Music app**, which comes with macOS.

### Download from GitHub Releases

1. Open the [latest release](https://github.com/ChristianTabor/Argon/releases/latest).
2. Download `Argon-darwin-arm64.zip` for Apple silicon (M1 and later) or
   `Argon-darwin-x64.zip` for Intel.
3. Unzip it and move `Argon.app` to `/Applications`.

**Opening it the first time.** Release builds are ad-hoc signed but not notarized yet
([#7](https://github.com/ChristianTabor/Argon/issues/7)), so macOS blocks the first launch of
a downloaded copy. From 1.1.1 on, get past it like this:

1. Open Argon. macOS says **Apple could not verify "Argon" is free of malware** (older macOS
   versions word it differently). Click **Done**.
2. Open System Settings → Privacy & Security, scroll to **Security**, and click **Open Anyway**
   next to the message about Argon.
3. In the dialog that follows, click **Open Anyway** and confirm with your password or Touch ID
   if asked. macOS remembers this, so later launches open normally.

**Fallback.** Builds before 1.1.1 show **"Argon" is damaged and can't be opened** instead, with
no Open Anyway button. The download isn't broken; those builds' signature was invalid.
Download the latest release instead. If you still see that message, or Open Anyway doesn't
appear, remove the download flag in Terminal and open Argon again:

```bash
xattr -dr com.apple.quarantine /Applications/Argon.app
```

Only do this for a copy you downloaded from this repository's Releases page.

### Homebrew

Not available yet. A Homebrew cask is planned in
[#7](https://github.com/ChristianTabor/Argon/issues/7).

### Run from Source

You'll need [Node.js](https://nodejs.org/) (the current LTS release).

```bash
git clone https://github.com/ChristianTabor/Argon.git
cd Argon
npm install
npm start
```

`npm run dev` does the same and opens DevTools in a detached window.

When you run from source, the Automation permission belongs to the app you launched it from
(Terminal, iTerm, VS Code), not to Argon. See [Troubleshooting](#troubleshooting).

### Build .app Bundle

```bash
npm run build
```

This runs `build-and-install.sh`, which is meant for the maintainer's Mac. It regenerates the
icon files in `assets/`, packages **Argon** and **Argon Glass** (the same app with a glass
icon) for your Mac's architecture with `@electron/packager`, and replaces any existing copies
in `/Applications`.

## First Launch: Automation Permission

The first time Argon talks to Music, macOS asks whether **"Argon" wants access to control
"Music"**. Click **Allow**. Argon can't do anything without it.

## Troubleshooting

**It only shows "Open Apple Music to begin".** Argon shows this when Music is stopped, and
also when it can't reach Music at all. Start playing something in Music. If that doesn't
help, check the permission below.

**I clicked Don't Allow.** Open System Settings → Privacy & Security → Automation, find
**Argon**, and turn on **Music**. Or reset the decision and relaunch Argon to get the prompt
again:

```bash
tccutil reset AppleEvents com.tabor.argon
```

**Running from source, nothing works.** The prompt names your terminal or editor, not Argon.
Look under that app in System Settings → Privacy & Security → Automation. To reset it, use its
bundle id: for example `tccutil reset AppleEvents com.apple.Terminal`. This resets every
Automation decision for that app, not just Music.

**Media keys don't work.** They're off unless you turn them on: check **Capture Media Keys**
in the menu bar menu. macOS only lets Argon use the media keys with Accessibility permission,
and asks for it when you turn them on. If the menu shows **Media Keys Need Accessibility
Permission…**, click it, turn Argon on under System Settings → Privacy & Security →
Accessibility, then uncheck and check **Capture Media Keys** again (or relaunch Argon).

**A `Cmd+Shift` shortcut doesn't work.** Another app may have claimed it first. The menu bar
menu lists any shortcut Argon couldn't get under **In use by another app**. Check that
**Global Shortcuts (Cmd+Shift)** is on, too.

**No notifications.** Check that notifications are on for Argon in System Settings →
Notifications.

**Music opens by itself.** Argon checks Music twice a second, and AppleScript starts Music if
it isn't running. Quit Argon (menu bar icon → **Quit Argon**) before you quit Music.

## Limitations

- **macOS only, and Music only.** Argon controls the Music app. It doesn't play audio, and it
  doesn't work with Spotify or other players.
- **The visualizer is simulated.** Argon can't read Music's audio, so the visualizer animates
  made-up data. It follows Music's state (playing, paused, fast-forwarding), not the sound.
- **The equalizer doesn't change the sound.** It saves its slider positions and preset, but
  nothing is applied to the audio. Music's own equalizer is separate.
- **Lyrics depend on the track.** Argon shows the lyrics Music has stored for the track.
  Tracks without them show "No lyrics available for this track".
- **Global shortcuts can be turned off, not changed.** Each group (media keys, `Cmd+Shift`
  hotkeys) is on or off as a whole, and the keys themselves are fixed.
- **Builds aren't notarized yet.** They're ad-hoc signed, so the first launch needs **Open
  Anyway**. See [Download from GitHub Releases](#download-from-github-releases).

## Keyboard Shortcuts

### In-App Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Cmd + Right` | Next Track |
| `Cmd + Left` | Previous Track |
| `Right` | Seek Forward 5s |
| `Left` | Seek Back 5s |
| `Up` | Volume Up |
| `Down` | Volume Down |
| `M` | Mute / Unmute |
| `S` | Toggle Shuffle |
| `R` | Toggle Repeat |
| `T` | Toggle Theme Panel |
| `V` | Cycle Visualizer Mode |
| `D` | Toggle Dark/Light Text |
| `L` | Toggle Lyrics Panel |
| `E` | Toggle Equalizer Panel |
| `P` | Show / Hide Playlist |
| `F` | Favorite / Unfavorite the Current Track |

### Mouse

| Action | Effect |
|--------|--------|
| Click the time display | Switch between elapsed and remaining time |
| Click the scrolling title | Pause / resume the scrolling |
| `Shift` + click the scrolling title | Reverse the scrolling |
| Double-click the title bar's **Argon** label | Enter windowshade mode |
| Double-click the windowshade bar's **ARGON** label | Leave windowshade mode |
| Hover a theme card | Preview the theme's colors |

### Global Shortcuts (System-Wide)

Global shortcuts are optional, in two groups you turn on or off in the menu bar menu:

| Shortcut | Action | Menu bar item | Default |
|----------|--------|---------------|---------|
| `Media Play/Pause` | Play / Pause | **Capture Media Keys** | Off |
| `Media Next` | Next Track | **Capture Media Keys** | Off |
| `Media Previous` | Previous Track | **Capture Media Keys** | Off |
| `Cmd + Shift + Up` | Volume Up | **Global Shortcuts (Cmd+Shift)** | On |
| `Cmd + Shift + Down` | Volume Down | **Global Shortcuts (Cmd+Shift)** | On |
| `Cmd + Shift + M` | Toggle Windowshade | **Global Shortcuts (Cmd+Shift)** | On |

The media keys are off for new installs so Argon doesn't take them from Music or other
players. If you used Argon before this choice existed, they stay on. They need macOS
Accessibility permission: macOS asks when you turn them on, and the menu shows **Media Keys
Need Accessibility Permission…** until it's granted. See [Troubleshooting](#troubleshooting).

## The menu bar menu

Click the menu bar icon to bring Argon to the front and open the menu. Right-click (or
Control-click) opens the menu without moving Argon. The menu has:

- the current track and artist;
- **Play/Pause**, **Next Track** and **Previous Track**;
- **Show Window** or **Hide Window**;
- **Show Dock Icon**: uncheck it to keep Argon out of the Dock;
- **Capture Media Keys**: the media keys control Music through Argon;
- **Global Shortcuts (Cmd+Shift)**: the `Cmd+Shift` hotkeys above;
- a line when a shortcut that's on isn't working: **Media Keys Need Accessibility
  Permission…**, or **In use by another app** with the shortcuts another app holds;
- **Quit Argon**. Closing the window doesn't quit Argon; it keeps running in the menu bar.

Your choices are saved.

## Theme System

Themes are CSS files that override custom properties defined in `base.css`. A theme controls:

- **Colors** — Every color in the UI (`--bg-primary`, `--accent`, `--text-primary`, etc.)
- **Fonts** — Display and UI typefaces (`--font-display`, `--font-ui`)
- **Layout** — Section order, visibility, sizing (`--order-artwork`, `--show-playlist`, etc.)
- **Window** — Size constraints (`--base-width`, `--window-min-height`, etc.)

### Installing Themes

1. Click **Themes** in the bottom bar (or press `T`)
2. Click **Install** to load a `.zip` theme
3. Or drop theme folders into the themes directory (click the folder icon)

### Theme Structure

```
my-theme/
  theme.json    # { "name": "My Theme", "author": "...", "category": "..." }
  theme.css     # CSS custom property overrides
```

The full guide is in [docs/themes.md](docs/themes.md).

## Tech Stack

- **Electron 28** — App shell with native macOS integration
- **AppleScript** via `osascript` — Apple Music control and metadata
- **Vanilla JS** — No frameworks
- **CSS Custom Properties** — Complete theme engine with 80+ variables
- **Canvas API** — Visualizer drawing

## Project Structure

```
argon/
  main.js              # Electron main process (IPC, tray, shortcuts, notifications)
  preload.js           # Context bridge API
  src/
    index.html         # Single-page UI
    js/
      app.js           # Application logic, state, UI binding
      visualizer.js    # Canvas visualizer
      theme-manager.js # Theme loading, switching, hover preview
      favorite.js      # Favorite heart state
      playlist-layout.js # Window height for the PL button
    styles/
      base.css         # Base styles + full CSS variable surface
    themes/            # Built-in theme directories
  docs/                # Architecture, themes, releases, screenshots
  test/                # Jest tests
```

## Documentation

- [Architecture](docs/architecture.md): processes, the IPC reference, the AppleScript bridge,
  polling and prefs
- [Creating themes](docs/themes.md)
- [Releases](docs/release.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
