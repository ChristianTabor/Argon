# Creating Themes for WinAMP for Apple Music

Anyone can create a theme! A theme is simply a folder containing two files:

## Theme Structure

```
my-awesome-theme/
├── theme.json    <- metadata
└── theme.css     <- CSS custom property overrides
```

## theme.json

```json
{
  "name": "My Awesome Theme",
  "author": "Your Name",
  "version": "1.0.0",
  "description": "A short description of your theme.",
  "preview": ["#bg-color", "#accent-1", "#accent-2", "#display-bg"]
}
```

The `preview` array contains 4 hex colors shown as swatches in the theme picker.

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

Themes can dictate the min/max window size:

```css
:root {
  --base-width: 300;           /* Base width for zoom scaling (unitless px) */
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
- The player auto-scales (zoom) based on `--base-width` — set it to match your design width
- When using `--controls-volume-layout: flex`, add CSS for `.controls-volume-group` to style the unified row

## Installing a Theme

### Manual Install
1. Place your theme folder in the user themes directory
   - Click the folder icon in the Themes panel to open it
2. Restart the app or reopen the Themes panel

### Zip Install
1. Zip your theme folder (e.g., `my-awesome-theme.zip`)
2. Click "Install" in the Themes panel
3. Select your .zip file
4. The theme appears instantly!

## Sharing Themes

Just zip your theme folder and share the .zip file. Recipients can install it
with one click using the Install button in the Themes panel.
