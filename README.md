# Argon

A Winamp-inspired Apple Music controller for macOS, built with Electron.

Argon gives you a compact, themeable, always-on-top music controller that wraps Apple Music via AppleScript. It ships with a full theme engine, adaptive album art colors, a 10-band equalizer, lyrics display, mini mode, and system tray integration.

![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white)
![macOS](https://img.shields.io/badge/macOS-Sonoma+-000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Winamp-style UI** — Compact player with visualizer, seek bar, volume, shuffle/repeat
- **Theme Engine** — 10+ built-in themes, user-installable .zip themes, per-theme layout control
- **Adaptive Theme** — Extracts colors from album art in real-time (WCAG contrast-safe)
- **Mini Mode** — 320x56 horizontal strip with essential controls
- **Lyrics Display** — Fetches lyrics from Apple Music metadata
- **10-Band Equalizer** — Visual EQ with 10 presets (Rock, Pop, Jazz, Classical, etc.)
- **Global Shortcuts** — Media keys and custom hotkeys work system-wide
- **Menu Bar / Tray** — Tray icon with playback controls and track info
- **Track Notifications** — Native macOS notifications on track change
- **Background Transparency** — Adjustable opacity with macOS vibrancy
- **Dark/Light Text Mode** — Toggle text polarity for any background
- **Playlist Viewer** — Scrollable queue with click-to-play
- **Window Snap** — Snap to bottom-right corner, lock position, always-on-top
- **Visualizer** — Multiple modes (bars, waveform, spectrum) with theme-aware colors

## Install

### Prerequisites

- **macOS** (Sonoma or later recommended)
- **Node.js** 18+
- **Apple Music** app (included with macOS)

### Run from Source

```bash
git clone https://github.com/your-username/argon.git
cd argon
npm install
npm start
```

### Build .app Bundle

```bash
npm run build
```

This runs `build-and-install.sh`, which packages Argon using `@electron/packager` and copies it to `/Applications`.

### Development Mode

```bash
npm run dev
```

Opens with DevTools detached for debugging.

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

### Global Shortcuts (System-Wide)

| Shortcut | Action |
|----------|--------|
| `Media Play/Pause` | Play / Pause |
| `Media Next` | Next Track |
| `Media Previous` | Previous Track |
| `Cmd + Shift + Up` | Volume Up |
| `Cmd + Shift + Down` | Volume Down |
| `Cmd + Shift + M` | Toggle Mini Mode |

## Theme System

Themes are CSS files that override custom properties defined in `base.css`. A theme controls:

- **Colors** — Every color in the UI (`--bg-primary`, `--accent`, `--text-primary`, etc.)
- **Fonts** — Display and UI typefaces (`--font-display`, `--font-ui`)
- **Layout** — Section order, visibility, sizing (`--order-artwork`, `--show-playlist`, etc.)
- **Window** — Size constraints (`--base-width`, `--window-min-height`, etc.)

### Installing Themes

1. Click **Themes** in the bottom bar (or press `T`)
2. Click the install button to load a `.zip` theme
3. Or drop theme folders into the themes directory (click the folder icon)

### Theme Structure

```
my-theme/
  theme.json    # { "name": "My Theme", "author": "...", "category": "..." }
  theme.css     # CSS custom property overrides
```

## Tech Stack

- **Electron 28** — App shell with native macOS integration
- **AppleScript** via `osascript` — Apple Music control and metadata
- **Vanilla JS** — No frameworks, ~1000 lines of application logic
- **CSS Custom Properties** — Complete theme engine with 80+ variables
- **Canvas API** — Real-time audio visualizer

## Project Structure

```
argon/
  main.js              # Electron main process (IPC, tray, shortcuts, notifications)
  preload.js           # Context bridge API
  src/
    index.html         # Single-page UI
    js/
      app.js           # Application logic, state, UI binding
      visualizer.js    # Canvas-based audio visualizer
      theme-manager.js # Theme loading, switching, adaptive colors
    styles/
      base.css         # Base styles + full CSS variable surface
    themes/            # Built-in theme directories
```

## License

MIT
