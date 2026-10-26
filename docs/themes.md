# Creating Themes for Argon

Anyone can create a theme. A theme is a folder containing two files:

## Theme Structure

```
my-awesome-theme/
├── theme.json    <- metadata
└── theme.css     <- CSS custom property overrides
```

The folder name is the theme's id. Argon saves the id in prefs to remember your theme. A theme
installed from a `.zip` gets the zip's file name, without `.zip`, as its id.

## theme.json

```json
{
  "name": "My Awesome Theme",
  "author": "Your Name",
  "version": "1.0.0",
  "category": "Vibes",
  "description": "A short description of your theme.",
  "preview": ["#1a1a2e", "#00ff41", "#00d4aa", "#0a0a12"]
}
```

| Field | Used for |
|-------|----------|
| `name` | The card title in the Themes panel. Defaults to "Untitled". |
| `author` | The "by …" line on the card. Defaults to "Unknown". |
| `category` | The tab the theme appears under. See [Categories](#categories). |
| `preview` | The color swatches on the card. See [Preview swatches](#preview-swatches). |
| `version`, `description` | Not shown in the app today. Fill them in anyway; they help people who share themes. |

`theme.json` must be valid JSON. A theme with a broken `theme.json` is left out of the list.

### Categories

The Themes panel groups themes into tabs by `category`:

- The tabs are **All**, then **Classic**, **Modern** and **Vibes** if any theme uses them, then
  any other category in the order Argon finds it.
- Tabs only appear when there are at least two categories. With one category or none, the
  panel shows a single list.
- A theme without a `category` only appears under **All**.
- Category names are case-sensitive: `vibes` makes a new tab next to `Vibes`.

The built-in themes use `Classic`, `Modern` and `Vibes`.

### Preview swatches

Each entry in `preview` becomes one swatch, and the first one is also the card's background.
Four colors is the convention: background, accent, second accent, display background.

To keep theme files from injecting CSS, each color must be either:

- a hex color: `#` followed by 3 to 8 hex digits, such as `#0f0` or `#00ff41cc`; or
- a bare color name made only of letters, such as `black` or `transparent`.

Anything else, including `rgb()`, `hsl()` and gradients, is shown as `#111`. Without a
`preview` array the card uses Classic Winamp's colors.

### Album Adaptive

**Album Adaptive** is always the first card under **All**. It isn't a folder and you can't
edit it. It builds colors from the current album artwork each time the artwork changes.
Selecting it saves the id `_adaptive`, so don't name a theme folder `_adaptive`.

### Name clashes with built-in themes

If a user theme's folder has the same name as a built-in theme (for example
`classic-winamp`), the built-in one wins: both cards appear, but either one loads the built-in
theme. Give your theme folder a unique name.

## theme.css

Override any of these CSS custom properties inside a `:root` selector:

### Colors

```css
:root {
  /* Core Palette */
  --bg-primary: #18181b;        /* Main background */
  --bg-secondary: #1f1f23;     /* Panel backgrounds */
  --bg-display: #0c0c0e;       /* LCD display background */
  --bg-panel: #1a1a1e;         /* Theme panel background */

  /* Text */
  --text-primary: #fafafa;     /* Primary text (track name) */
  --text-secondary: #a1a1aa;   /* Secondary text */
  --text-dim: #52525b;         /* Dimmed/inactive text */
  --text-accent: #f59e0b;      /* Accent colored text */

  /* Accent Colors */
  --accent: #f59e0b;           /* Primary accent (buttons, fills) */
  --accent-dim: rgba(245, 158, 11, 0.12);
  --accent-glow: rgba(245, 158, 11, 0.3);
  --accent-secondary: #fbbf24;

  /* Controls */
  --ctrl-bg: rgba(255, 255, 255, 0.05);
  --ctrl-hover: rgba(255, 255, 255, 0.08);
  --ctrl-active: rgba(245, 158, 11, 0.15);

  /* Seek & Volume Bars */
  --bar-bg: rgba(255, 255, 255, 0.08);
  --bar-fill: #f59e0b;         /* Can be a gradient! */
  --bar-handle: #f59e0b;

  /* Borders & Shadows */
  --border: rgba(255, 255, 255, 0.06);
  --border-accent: rgba(245, 158, 11, 0.2);
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  --glow: 0 0 20px rgba(245, 158, 11, 0.3);

  /* Visualizer Colors */
  --viz-color-1: #f59e0b;
  --viz-color-2: #fbbf24;
  --viz-color-3: #f97316;
  --viz-bg: transparent;

  /* Titlebar */
  --titlebar-bg: rgba(0, 0, 0, 0.4);
  --titlebar-text: #71717a;

  /* Album Artwork */
  --artwork-border: rgba(245, 158, 11, 0.15);
  --artwork-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  --artwork-radius: 8px;       /* 0 = sharp, 50% = circle */

  /* Panel & Logo */
  --panel-bg: #1f1f23;
  --logo-color: #52525b;
  --logo-accent-color: #f59e0b;
}
```

### Fonts & Sizes

```css
:root {
  --font-display: 'Share Tech Mono', monospace;
  --font-ui: 'Inter', -apple-system, sans-serif;

  --fs-titlebar: 10px;
  --fs-display-label: 7px;
  --fs-display-value: 11px;
  --fs-stereo: 7px;
  --fs-marquee: 12px;
  --fs-album: 9px;
  --fs-time: 15px;
  --fs-time-total: 12px;
  --fs-bottom: 9px;
  --fs-logo: 14px;

  --titlebar-height: 30px;
  --viz-height: 36px;
  --seek-height: 6px;
  --volume-height: 4px;
  --handle-size: 12px;
  --ctrl-btn-size: 34px;
  --ctrl-playpause-size: 44px;
  --ctrl-mode-size: 30px;
  --ctrl-icon-size: 16px;
  --ctrl-playpause-icon: 20px;

  --radius: 10px;
  --radius-sm: 5px;
  --radius-xs: 3px;
}
```

### Section Ordering

Control the vertical order of every section:

```css
:root {
  --order-titlebar: 0;
  --order-visualizer: 1;
  --order-display: 2;
  --order-track-info: 3;
  --order-artwork: 4;
  --order-seek: 5;
  --order-controls: 6;
  --order-volume: 7;
  --order-playlist: 8;
  --order-bottom: 9;
}
```

### Section Visibility

Show or hide any section:

```css
:root {
  --show-visualizer: flex;   /* flex | none */
  --show-display: block;     /* block | none */
  --show-display-top: flex;  /* flex | none (KBPS/KHZ/STEREO row) */
  --show-album: block;       /* block | none */
  --show-artwork: flex;      /* flex | none */
  --show-seek: flex;         /* flex | none */
  --show-controls: flex;     /* flex | none */
  --show-controls-secondary: flex; /* flex | none (shuffle/repeat) */
  --show-volume: flex;       /* flex | none */
  --show-bottom: flex;       /* flex | none */
}
```

### Layout Templates

These variables control alternate layout modes. Mix and match to create
completely different player layouts:

```css
:root {
  /* Show separate track name + artist (large, clean) instead of marquee */
  --show-track-info: none;      /* none | flex */

  /* Show time inline beside the seek bar (0:15 ──── 3:24) */
  --show-seek-times: none;      /* none | flex */

  /* Hide original time display when using inline seek times */
  --show-time-display: flex;    /* flex | none */

  /* Show playlist/queue viewer */
  --show-playlist: none;        /* none | flex */

  /* Put controls + volume on the same row */
  --controls-volume-layout: contents;  /* contents | flex */
}
```

### Window Constraints

Themes set the window size when they load, and its limits. Use unitless pixel values:

```css
:root {
  --base-width: 300;           /* Window width when the theme loads (unitless px) */
  --window-min-width: 275;     /* Min window width */
  --window-min-height: 440;    /* Min window height */
  --window-max-width: 800;     /* Max window width */
  --window-max-height: 1200;   /* Max window height */
}
```

## Layout Examples

### Classic Winamp (default)
Display box with marquee, album art, separate controls and volume.

### Terminal / Minimal
```css
:root {
  --show-display: none;
  --show-artwork: none;
  --show-bottom: none;
  --show-track-info: flex;
  --show-seek-times: flex;
  --show-time-display: none;
  --show-playlist: flex;
  --controls-volume-layout: flex;
}
```

### Compact (no visualizer, no playlist)
```css
:root {
  --show-visualizer: none;
  --show-display-top: none;
  --show-playlist: none;
  --viz-height: 0px;
}
```

## Tips

- Use `linear-gradient()` for `--bar-fill` to create gradient seek/volume bars
- Adjust `--artwork-radius` to change album art shape (e.g., `50%` for circles)
- The visualizer reads `--viz-color-1/2/3` in real time
- You don't need to override every variable — just the ones you want to change
- `--base-width` sets the window width when the theme loads — set it to match your design width
- When using `--controls-volume-layout: flex`, add CSS for `.controls-volume-group` to style the unified row

## Installing a Theme

### Manual Install
1. Place your theme folder in the user themes directory
   - Click the folder icon in the Themes panel to open it
   - It's `~/Library/Application Support/argon/themes/`
2. Close and reopen the Themes panel

### Zip Install
1. Zip your theme folder (e.g., `my-awesome-theme.zip`)
2. Click "Install" in the Themes panel
3. Select your .zip file
4. Argon installs and applies the theme

The zip must hold the two files at the top level, or a single folder that holds them. If
anything else sits next to that folder (a `__MACOSX` folder, say), the install fails. Argon
doesn't show install errors yet, so if nothing happens, check the zip's layout. To make a zip
with the files at the top level:

```bash
cd my-awesome-theme && zip -r ../my-awesome-theme.zip theme.json theme.css
```

Installing a zip with the same file name as an installed theme overwrites that theme's files.

## Sharing Themes

Just zip your theme folder and share the .zip file. Recipients can install it
with one click using the Install button in the Themes panel.
