// ═══════════════════════════════════════════════════════════════════════════
// App — Main application logic, binds everything together
// ═══════════════════════════════════════════════════════════════════════════

(async function () {
  // ─── Elements ──────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const player = $('#player');
  const marqueeText = $('#marquee-text');
  const albumDisplay = $('#album-display');
  const timeCurrent = $('#time-current');
  const timeTotal = $('#time-total');
  const seekTimeLeft = $('#seek-time-left');
  const seekTimeRight = $('#seek-time-right');
  const trackNameDisplay = $('#track-name-display');
  const trackArtistDisplay = $('#track-artist-display');
  const artworkImg = $('#artwork-img');
  const artworkPlaceholder = $('.artwork-placeholder');
  const seekBar = $('#seek-bar');
  const seekFill = $('#seek-fill');
  const seekHandle = $('#seek-handle');
  const volumeBar = $('#volume-bar');
  const volumeFill = $('#volume-fill');
  const volumeHandle = $('#volume-handle');
  const btnPlayPause = $('#btn-playpause');
  const iconPlay = $('#icon-play');
  const iconPause = $('#icon-pause');
  const btnPrev = $('#btn-prev');
  const btnNext = $('#btn-next');
  const btnShuffle = $('#btn-shuffle');
  const btnRepeat = $('#btn-repeat');
  const repeatBadge = $('#repeat-badge');
  const btnMute = $('#btn-mute');
  const btnSnap = $('#btn-snap');
  const btnLock = $('#btn-lock');
  const btnPin = $('#btn-pin');
  const btnMinimize = $('#btn-minimize');
  const btnClose = $('#btn-close');
  const btnThemes = $('#btn-themes');
  const btnEq = $('#btn-eq');
  const btnCloseThemes = $('#btn-close-themes');
  const btnInstallTheme = $('#btn-install-theme');
  const btnOpenThemesFolder = $('#btn-open-themes-folder');
  const vizModeToggle = $('#viz-mode-toggle');
  const volWave1 = $('#vol-wave1');
  const volWave2 = $('#vol-wave2');
  const playlistTitle = $('#playlist-title');
  const playlistCount = $('#playlist-count');
  const playlistTracks = $('#playlist-tracks');
  const btnPlaylistSnap = $('#btn-playlist-snap');
  const transparencySlider = $('#transparency-slider');
  const btnTextMode = $('#btn-text-mode');
  const btnMini = $('#btn-mini');
  const btnLyrics = $('#btn-lyrics');
  const lyricsPanel = $('#lyrics-panel');
  const lyricsContent = $('#lyrics-content');
  const btnCloseLyrics = $('#btn-close-lyrics');
  const eqPanel = $('#eq-panel');
  const eqSliders = $('#eq-sliders');
  const eqLabels = $('#eq-labels');
  const eqPresetSelect = $('#eq-preset-select');
  const btnCloseEq = $('#btn-close-eq');
  const miniPlayer = $('#mini-player');
  const miniTrack = $('#mini-track');
  const miniArtist = $('#mini-artist');
  const miniPrev = $('#mini-prev');
  const miniNext = $('#mini-next');
  const miniPlayPause = $('#mini-playpause');
  const miniExpand = $('#mini-expand');
  const miniIconPlay = $('.mini-icon-play');
  const miniIconPause = $('.mini-icon-pause');

  // ─── State ─────────────────────────────────────────────────────────────
  let state = {
    playing: false,
    track: '',
    artist: '',
    album: '',
    duration: 0,
    position: 0,
    volume: 50,
    shuffle: false,
    repeat: 'off',
    muted: false,
    prevVolume: 50,
    lastArtwork: null,
    lastTrack: '',
    adaptiveTheme: false,
    playlistData: null,
    playlistLastTrack: '',
    notifiedTrack: '',
    lyricsOpen: false,
    lyricsTrack: '',
    eqOpen: false,
    eqBands: [0,0,0,0,0,0,0,0,0,0],
    miniMode: false,
  };

  // Drag state (declared early — referenced by updateUI before seek/volume sections)
  let seekDragging = false;
  let volumeDragging = false;

  // ─── Window Constraints ───────────────────────────────────────────────
  function applyWindowConstraints() {
    const style = getComputedStyle(document.documentElement);
    const baseW = parseInt(style.getPropertyValue('--base-width').trim()) || 300;
    const minW  = parseInt(style.getPropertyValue('--window-min-width').trim()) || 275;
    const minH  = parseInt(style.getPropertyValue('--window-min-height').trim()) || 440;
    const maxW  = parseInt(style.getPropertyValue('--window-max-width').trim()) || 800;
    const maxH  = parseInt(style.getPropertyValue('--window-max-height').trim()) || 1200;
    window.api.window.applyConstraints(minW, minH, maxW, maxH, baseW, minH);
  }

  // ─── CSS Transition-Based Seek ────────────────────────────────────────
  // Instead of rAF lerp, we use CSS transitions. On each poll we set the
  // seek bar to the current % and transition to 100% over (duration - pos)
  // seconds. This produces perfectly smooth, jank-free animation.
  let seek = {
    position: 0,
    duration: 0,
    isPlaying: false,
    lastTrack: '',     // detect track changes
    timeUpdateRAF: null,
    startedAt: 0,      // performance.now() when we set the transition
    startPos: 0,       // position (seconds) when we set the transition
  };

  function setSeekPosition(posSec, durSec, animate) {
    if (durSec <= 0) return;
    const pct = (posSec / durSec) * 100;

    if (animate && seek.isPlaying) {
      const remaining = durSec - posSec;
      // Set current position instantly, then animate to 100%
      seekFill.style.transition = 'none';
      seekHandle.style.transition = 'none';
      seekFill.style.width = `${pct}%`;
      seekHandle.style.left = `${pct}%`;

      // Force reflow so the instant position takes effect
      seekFill.offsetWidth;

      // Now animate to 100% over the remaining song time
      seekFill.style.transition = `width ${remaining}s linear`;
      seekHandle.style.transition = `left ${remaining}s linear`;
      seekFill.style.width = '100%';
      seekHandle.style.left = '100%';

      // Track when animation started for time display interpolation
      seek.startedAt = performance.now();
      seek.startPos = posSec;

      startTimeUpdater();
    } else {
      // No animation (paused/stopped) — just set position
      seekFill.style.transition = 'none';
      seekHandle.style.transition = 'none';
      seekFill.style.width = `${pct}%`;
      seekHandle.style.left = `${pct}%`;
      stopTimeUpdater();

      const timeStr = formatTime(posSec);
      timeCurrent.textContent = timeStr;
      seekTimeLeft.textContent = timeStr;
    }
  }

  // Update the time display text at ~4fps (every 250ms) using rAF
  function startTimeUpdater() {
    if (seek.timeUpdateRAF) return;
    function tick() {
      if (!seek.isPlaying || seekDragging) {
        seek.timeUpdateRAF = null;
        return;
      }
      const elapsed = (performance.now() - seek.startedAt) / 1000;
      const displayPos = Math.min(seek.startPos + elapsed, seek.duration);
      const timeStr = formatTime(displayPos);
      timeCurrent.textContent = timeStr;
      seekTimeLeft.textContent = timeStr;
      seek.timeUpdateRAF = requestAnimationFrame(tick);
    }
    seek.timeUpdateRAF = requestAnimationFrame(tick);
  }

  function stopTimeUpdater() {
    if (seek.timeUpdateRAF) {
      cancelAnimationFrame(seek.timeUpdateRAF);
      seek.timeUpdateRAF = null;
    }
  }

  // ─── Visualizer ────────────────────────────────────────────────────────
  const viz = new Visualizer($('#visualizer'));

  // ─── Theme Manager ────────────────────────────────────────────────────
  const themeManager = new ThemeManager();
  await themeManager.init();

  // Check if adaptive was the saved theme
  if (themeManager.currentTheme === '_adaptive') {
    state.adaptiveTheme = true;
  }

  // Apply window constraints after theme loads
  requestAnimationFrame(() => {
    applyWindowConstraints();
  });

  // ─── Background Transparency ──────────────────────────────────────────
  let bgOpacity = 1;
  let originalBgColors = {};
  const transparencyStyleEl = document.createElement('style');
  transparencyStyleEl.id = 'transparency-styles';
  document.head.appendChild(transparencyStyleEl);

  function parseColor(str) {
    if (!str) return null;
    str = str.trim();
    if (str.startsWith('#')) {
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
    }
    const rgbaM = str.match(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/);
    if (rgbaM) return { r: +rgbaM[1], g: +rgbaM[2], b: +rgbaM[3], a: parseFloat(rgbaM[4]) };
    const rgbM = str.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (rgbM) return { r: +rgbM[1], g: +rgbM[2], b: +rgbM[3], a: 1 };
    return null;
  }

  function cacheBgColors() {
    transparencyStyleEl.textContent = '';
    // Force style recalculation after clearing overrides
    void document.documentElement.offsetHeight;
    const style = getComputedStyle(document.documentElement);
    const vars = ['--bg-primary', '--bg-secondary', '--bg-display', '--bg-panel', '--panel-bg', '--titlebar-bg'];
    originalBgColors = {};
    for (const v of vars) {
      originalBgColors[v] = style.getPropertyValue(v).trim();
    }
  }

  function applyBgTransparency(opacity) {
    const wasOpaque = bgOpacity >= 1;
    const nowOpaque = opacity >= 1;
    bgOpacity = opacity;

    // Toggle vibrancy when crossing the 100% boundary
    if (wasOpaque && !nowOpaque) {
      window.api.window.setVibrancy(null);
    } else if (!wasOpaque && nowOpaque) {
      window.api.window.setVibrancy('under-window');
    }

    if (nowOpaque) {
      transparencyStyleEl.textContent = '';
      return;
    }
    let css = ':root {\n';
    for (const [v, color] of Object.entries(originalBgColors)) {
      const c = parseColor(color);
      if (c) {
        css += `  ${v}: rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * opacity}) !important;\n`;
      }
    }
    // Reduce shadow and soften border when transparent
    css += `  --shadow: 0 4px 16px rgba(0, 0, 0, ${0.2 * opacity}) !important;\n`;
    css += `  --border: rgba(255, 255, 255, ${0.06 * opacity}) !important;\n`;
    css += '}';
    transparencyStyleEl.textContent = css;
  }

  // Load saved transparency and apply
  (async () => {
    const p = await window.api.prefs.load();
    if (p.transparency != null && p.transparency < 100) {
      const opacity = p.transparency / 100;
      if (transparencySlider) transparencySlider.value = p.transparency;
      // Disable vibrancy immediately for transparent mode
      window.api.window.setVibrancy(null);
      requestAnimationFrame(() => {
        cacheBgColors();
        applyBgTransparency(opacity);
      });
    } else {
      requestAnimationFrame(() => cacheBgColors());
    }
  })();

  // Listen for adaptive theme toggle
  window.addEventListener('themechange', (e) => {
    state.adaptiveTheme = e.detail.adaptive === true || e.detail.themeId === '_adaptive';
    if (state.adaptiveTheme && state.lastArtwork) {
      if (artworkImg.complete && artworkImg.naturalWidth > 0) {
        const colors = extractColors(artworkImg);
        if (colors) {
          document.getElementById('theme-styles').textContent = applyAdaptiveColors(colors);
        }
      }
    }
    // Update window constraints for new theme
    requestAnimationFrame(() => {
      applyWindowConstraints();
    });
    // Re-cache colors and re-apply transparency + text mode for the new theme
    transparencyStyleEl.textContent = '';
    requestAnimationFrame(() => {
      cacheBgColors();
      if (bgOpacity < 1) applyBgTransparency(bgOpacity);
      if (darkTextMode) applyDarkTextMode(true);
    });
  });

  // ─── Dark / Light Text Mode ─────────────────────────────────────────
  let darkTextMode = false;
  const textModeStyleEl = document.createElement('style');
  textModeStyleEl.id = 'text-mode-styles';
  document.head.appendChild(textModeStyleEl);

  function applyDarkTextMode(active) {
    darkTextMode = active;
    if (btnTextMode) btnTextMode.classList.toggle('active', active);

    if (!active) {
      textModeStyleEl.textContent = '';
      return;
    }

    // Dark text + dark chrome for light backgrounds
    textModeStyleEl.textContent = `:root {
      --text-primary: rgba(0, 0, 0, 0.85) !important;
      --text-secondary: rgba(0, 0, 0, 0.6) !important;
      --text-dim: rgba(0, 0, 0, 0.35) !important;
      --titlebar-text: rgba(0, 0, 0, 0.35) !important;
      --logo-color: rgba(0, 0, 0, 0.35) !important;
      --ctrl-bg: rgba(0, 0, 0, 0.04) !important;
      --ctrl-hover: rgba(0, 0, 0, 0.08) !important;
      --ctrl-active: rgba(0, 0, 0, 0.10) !important;
      --bar-bg: rgba(0, 0, 0, 0.08) !important;
      --border: rgba(0, 0, 0, 0.08) !important;
      --border-accent: rgba(0, 0, 0, 0.15) !important;
      --shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
      --glow: none !important;
      --accent-glow: transparent !important;
      --accent-dim: rgba(0, 0, 0, 0.06) !important;
      --artwork-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
      --artwork-border: rgba(0, 0, 0, 0.1) !important;
    }`;
  }

  // Load text mode from prefs
  (async () => {
    const p = await window.api.prefs.load();
    if (p.darkText) {
      applyDarkTextMode(true);
    }
  })();

  // ─── Formatting ────────────────────────────────────────────────────────
  function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function setMarquee(text) {
    marqueeText.textContent = text;
    marqueeText.classList.remove('scrolling');

    requestAnimationFrame(() => {
      const container = marqueeText.parentElement;
      if (marqueeText.scrollWidth > container.clientWidth) {
        marqueeText.textContent = text + '    \u25CF    ' + text + '    \u25CF    ';
        const duration = Math.max(8, text.length * 0.35);
        marqueeText.style.setProperty('--marquee-duration', `${duration}s`);
        marqueeText.classList.add('scrolling');
      }
    });
  }

  // ─── Update UI from State ──────────────────────────────────────────────
  function updateUI(newState) {
    const isPlaying = newState.state === 'playing';
    const isStopped = newState.state === 'stopped';

    // Play/pause icon toggle
    iconPlay.style.display = isPlaying ? 'none' : '';
    iconPause.style.display = isPlaying ? '' : 'none';
    btnPlayPause.classList.toggle('active', isPlaying);

    player.classList.toggle('playing', isPlaying);
    viz.setPlaying(isPlaying);

    if (artworkPlaceholder) {
      artworkPlaceholder.classList.toggle('stopped', !isPlaying);
    }

    // Track info
    if (newState.track && newState.track !== state.lastTrack) {
      const displayText = `${newState.track}  \u2014  ${newState.artist}`;
      setMarquee(displayText);
      state.lastTrack = newState.track;

      // Update separate track info display
      trackNameDisplay.textContent = newState.track;
      trackArtistDisplay.textContent = newState.artist;
    } else if (isStopped && state.lastTrack) {
      setMarquee('Argon — Open Apple Music to begin');
      state.lastTrack = '';
      trackNameDisplay.textContent = '';
      trackArtistDisplay.textContent = '';
    }

    // Album name
    if (newState.album) {
      albumDisplay.textContent = newState.album;
      albumDisplay.style.display = '';
    } else {
      albumDisplay.textContent = '';
      albumDisplay.style.display = 'none';
    }

    // Seek bar: use CSS transition for smooth animation
    if (!seekDragging && newState.duration > 0) {
      const wasPlaying = seek.isPlaying;
      seek.duration = newState.duration;
      seek.isPlaying = isPlaying;
      seek.position = newState.position;

      // Determine if we need to restart the transition
      const trackChanged = newState.track !== seek.lastTrack && newState.track;
      const playStateChanged = isPlaying !== wasPlaying;
      // Check for drift: compare expected position vs polled position
      const elapsed = (performance.now() - seek.startedAt) / 1000;
      const expectedPos = seek.startPos + elapsed;
      const drift = Math.abs(expectedPos - newState.position);
      const needsUpdate = trackChanged || playStateChanged || drift > 1.5;

      if (trackChanged) seek.lastTrack = newState.track;

      if (needsUpdate) {
        setSeekPosition(newState.position, newState.duration, isPlaying);
      }
    } else if (newState.duration <= 0) {
      seekFill.style.transition = 'none';
      seekHandle.style.transition = 'none';
      seekFill.style.width = '0%';
      seekHandle.style.left = '0%';
    }

    // Time total (only changes on track change)
    const totalStr = formatTime(newState.duration);
    timeTotal.textContent = totalStr;
    seekTimeRight.textContent = totalStr;

    // Volume
    if (!volumeDragging) {
      state.volume = newState.volume;
      updateVolumeUI(newState.volume);
    }

    // Shuffle
    state.shuffle = newState.shuffle;
    btnShuffle.classList.toggle('active', newState.shuffle);

    // Repeat
    state.repeat = newState.repeat;
    btnRepeat.classList.toggle('active', newState.repeat !== 'off');
    if (newState.repeat === 'one') {
      repeatBadge.style.display = '';
      repeatBadge.textContent = '1';
    } else {
      repeatBadge.style.display = 'none';
    }

    state.playing = isPlaying;
    state.duration = newState.duration;
    state.position = newState.position;

    updateMiniPlayerUI();
  }

  function updateVolumeUI(vol) {
    volumeFill.style.width = `${vol}%`;
    volumeHandle.style.left = `${vol}%`;
    if (vol === 0 || state.muted) {
      volWave1.style.opacity = '0.2';
      volWave2.style.opacity = '0.2';
    } else if (vol < 40) {
      volWave1.style.opacity = '1';
      volWave2.style.opacity = '0.2';
    } else {
      volWave1.style.opacity = '1';
      volWave2.style.opacity = '1';
    }
  }

  // ─── Album Adaptive Color Extraction ────────────────────────────────────
  const adaptiveCanvas = document.createElement('canvas');
  const adaptiveCtx = adaptiveCanvas.getContext('2d', { willReadFrequently: true });
  adaptiveCanvas.width = 64;
  adaptiveCanvas.height = 64;

  // Relative luminance (WCAG)
  function luminance(r, g, b) {
    const srgb = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Lighten or darken a color to ensure contrast against bg
  function ensureContrast(color, bgLum, minRatio) {
    let { r, g, b } = color;
    let lum = luminance(r, g, b);
    let ratio = contrastRatio(lum, bgLum);
    let iterations = 0;

    while (ratio < minRatio && iterations < 30) {
      if (bgLum < 0.5) {
        // Dark bg: lighten color
        r = Math.min(255, r + 8);
        g = Math.min(255, g + 8);
        b = Math.min(255, b + 8);
      } else {
        // Light bg: darken color
        r = Math.max(0, r - 8);
        g = Math.max(0, g - 8);
        b = Math.max(0, b - 8);
      }
      lum = luminance(r, g, b);
      ratio = contrastRatio(lum, bgLum);
      iterations++;
    }
    return { r, g, b };
  }

  function extractColors(imgEl) {
    adaptiveCtx.drawImage(imgEl, 0, 0, 64, 64);
    const data = adaptiveCtx.getImageData(0, 0, 64, 64).data;

    const buckets = {};
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 25 || lum > 230) continue;
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      if (!buckets[key]) buckets[key] = { r: qr, g: qg, b: qb, count: 0, satSum: 0 };
      buckets[key].count++;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      buckets[key].satSum += max === 0 ? 0 : (max - min) / max;
    }

    const sorted = Object.values(buckets)
      .map(b => ({ ...b, score: b.count * (b.satSum / b.count + 0.3) }))
      .sort((a, b) => b.score - a.score);

    if (sorted.length < 2) return null;

    const accent = sorted[0];
    let secondary = sorted[1];
    for (let i = 1; i < Math.min(sorted.length, 8); i++) {
      const dr = Math.abs(sorted[i].r - accent.r);
      const dg = Math.abs(sorted[i].g - accent.g);
      const db = Math.abs(sorted[i].b - accent.b);
      if (dr + dg + db > 80) { secondary = sorted[i]; break; }
    }

    // Find dark bg
    const darkBuckets = {};
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 60) continue;
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;
      const key = `${qr},${qg},${qb}`;
      if (!darkBuckets[key]) darkBuckets[key] = { r: qr, g: qg, b: qb, count: 0 };
      darkBuckets[key].count++;
    }
    const darkSorted = Object.values(darkBuckets).sort((a, b) => b.count - a.count);
    const bg = darkSorted.length > 0 ? darkSorted[0] : { r: 18, g: 18, b: 28 };

    return {
      accent: { r: accent.r, g: accent.g, b: accent.b },
      secondary: { r: secondary.r, g: secondary.g, b: secondary.b },
      bg: { r: bg.r, g: bg.g, b: bg.b },
    };
  }

  function applyAdaptiveColors(colors) {
    let { accent, secondary, bg } = colors;

    // Ensure bg is dark enough
    const bgLum = luminance(bg.r, bg.g, bg.b);
    if (bgLum > 0.15) {
      const factor = 0.3;
      bg = {
        r: Math.round(bg.r * factor),
        g: Math.round(bg.g * factor),
        b: Math.round(bg.b * factor),
      };
    }
    const finalBgLum = luminance(bg.r, bg.g, bg.b);

    // Ensure accent has >= 4.5:1 contrast against bg (WCAG AA)
    accent = ensureContrast(accent, finalBgLum, 4.5);
    // Secondary needs >= 3:1
    secondary = ensureContrast(secondary, finalBgLum, 3.0);

    // Compute a readable "light" text color — white tinted slightly with accent
    const textR = Math.min(255, 200 + Math.round(accent.r * 0.2));
    const textG = Math.min(255, 200 + Math.round(accent.g * 0.2));
    const textB = Math.min(255, 200 + Math.round(accent.b * 0.2));
    const textColor = ensureContrast({ r: textR, g: textG, b: textB }, finalBgLum, 7.0);

    const a = `${accent.r}, ${accent.g}, ${accent.b}`;
    const s = `${secondary.r}, ${secondary.g}, ${secondary.b}`;
    const t = `${textColor.r}, ${textColor.g}, ${textColor.b}`;
    const bgD = `${Math.max(0, bg.r - 6)}, ${Math.max(0, bg.g - 6)}, ${Math.max(0, bg.b - 6)}`;
    const bgL = `${Math.min(255, bg.r + 10)}, ${Math.min(255, bg.g + 10)}, ${Math.min(255, bg.b + 10)}`;
    const bgDD = `${Math.max(0, bg.r - 12)}, ${Math.max(0, bg.g - 12)}, ${Math.max(0, bg.b - 12)}`;

    return `:root {
      --bg-primary: rgb(${bgD});
      --bg-secondary: rgb(${bgL});
      --bg-display: rgb(${bgDD});
      --bg-panel: rgb(${bgL});
      --text-primary: rgb(${t});
      --text-secondary: rgba(${t}, 0.65);
      --text-dim: rgba(${t}, 0.25);
      --text-accent: rgb(${a});
      --accent: rgb(${a});
      --accent-dim: rgba(${a}, 0.12);
      --accent-glow: rgba(${a}, 0.3);
      --accent-secondary: rgb(${s});
      --ctrl-bg: rgba(${t}, 0.05);
      --ctrl-hover: rgba(${t}, 0.08);
      --ctrl-active: rgba(${a}, 0.18);
      --bar-bg: rgba(${t}, 0.08);
      --bar-fill: linear-gradient(90deg, rgb(${a}), rgb(${s}));
      --bar-handle: rgb(${a});
      --border: rgba(${t}, 0.06);
      --border-accent: rgba(${a}, 0.2);
      --shadow: 0 8px 32px rgba(0,0,0,0.6);
      --glow: 0 0 18px rgba(${a}, 0.3);
      --viz-color-1: rgb(${a});
      --viz-color-2: rgb(${s});
      --viz-color-3: rgb(${secondary.b}, ${secondary.r}, ${secondary.g});
      --titlebar-bg: rgba(0,0,0,0.25);
      --titlebar-text: rgba(${t}, 0.35);
      --artwork-border: rgba(${a}, 0.12);
      --artwork-shadow: 0 4px 20px rgba(0,0,0,0.5);
      --panel-bg: rgb(${bgL});
      --logo-color: rgba(${t}, 0.25);
      --logo-accent-color: rgb(${a});
    }`;
  }

  // ─── Artwork ───────────────────────────────────────────────────────────
  async function updateArtwork() {
    try {
      const art = await window.api.music.getArtwork();
      if (art && art !== state.lastArtwork) {
        artworkImg.src = art;
        artworkImg.style.display = '';
        artworkPlaceholder.style.display = 'none';
        state.lastArtwork = art;

        if (state.adaptiveTheme) {
          artworkImg.onload = () => {
            const colors = extractColors(artworkImg);
            if (colors) {
              document.getElementById('theme-styles').textContent = applyAdaptiveColors(colors);
            }
          };
          if (artworkImg.complete && artworkImg.naturalWidth > 0) {
            const colors = extractColors(artworkImg);
            if (colors) {
              document.getElementById('theme-styles').textContent = applyAdaptiveColors(colors);
            }
          }
        }
      } else if (!art) {
        artworkImg.style.display = 'none';
        artworkPlaceholder.style.display = '';
        state.lastArtwork = null;
      }
    } catch (e) { /* keep existing */ }
  }

  // ─── Playlist / Queue ─────────────────────────────────────────────────
  let playlistFetching = false;

  async function fetchPlaylist() {
    if (playlistFetching) return;
    playlistFetching = true;
    try {
      const data = await window.api.music.getPlaylist();
      if (data) {
        state.playlistData = data;
        renderPlaylist(data);
      }
    } catch (e) { /* ignore */ }
    playlistFetching = false;
  }

  function renderPlaylist(data) {
    playlistTitle.textContent = data.name || 'PLAYLIST';
    playlistCount.textContent = `${data.currentIndex} / ${data.count}`;

    playlistTracks.innerHTML = '';
    for (const track of data.tracks) {
      const el = document.createElement('div');
      el.className = 'playlist-track' + (track.index === data.currentIndex ? ' active' : '');
      el.dataset.index = track.index;

      const durMin = Math.floor(track.duration / 60);
      const durSec = Math.floor(track.duration % 60);
      const durStr = `${durMin}:${durSec.toString().padStart(2, '0')}`;

      const numDisplay = track.index === data.currentIndex
        ? '<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align:middle"><path d="M2 6h2.5L8 3v10L4.5 10H2V6Z" fill="currentColor"/><path d="M10.5 5.5c1 1 1 3.5 0 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>'
        : track.index.toString();

      el.innerHTML = `
        <span class="playlist-track-num">${numDisplay}</span>
        <span class="playlist-track-name">${escapeHtml(track.name)}</span>
        <span class="playlist-track-artist">${escapeHtml(track.artist)}</span>
        <span class="playlist-track-duration">${durStr}</span>
      `;

      el.addEventListener('click', () => {
        window.api.music.playTrackIndex(track.index);
      });

      playlistTracks.appendChild(el);
    }

    // Scroll active track into view
    const activeEl = playlistTracks.querySelector('.playlist-track.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Polling ───────────────────────────────────────────────────────────
  async function poll() {
    try {
      const newState = await window.api.music.getState();
      updateUI(newState);

      if (newState.track && newState.track !== state.track) {
        state.track = newState.track;
        state.artist = newState.artist;
        state.album = newState.album;
        updateArtwork();

        // Refresh playlist on track change
        if (newState.track !== state.playlistLastTrack) {
          state.playlistLastTrack = newState.track;
          fetchPlaylist();
        }

        // Track change notification (deduplicated)
        if (newState.track !== state.notifiedTrack) {
          state.notifiedTrack = newState.track;
          window.api.notifications.trackChange(newState.track, newState.artist, newState.album);
        }

        // Update tray with current track info
        window.api.tray.updateTrack(newState.track, newState.artist);

        // Refresh lyrics if panel is open
        if (state.lyricsOpen) fetchLyrics();
      }
    } catch (e) { /* retry */ }
  }

  setInterval(poll, 500);
  poll();

  // Fetch playlist once on startup
  setTimeout(fetchPlaylist, 1500);

  // ─── Seek Bar Interaction ──────────────────────────────────────────────
  function seekTo(e) {
    const rect = seekBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // During drag, stop CSS transition and set position directly
    seekFill.style.transition = 'none';
    seekHandle.style.transition = 'none';
    seekFill.style.width = `${pct * 100}%`;
    seekHandle.style.left = `${pct * 100}%`;
    const pos = pct * seek.duration;
    const timeStr = formatTime(pos);
    timeCurrent.textContent = timeStr;
    seekTimeLeft.textContent = timeStr;
    return pct;
  }

  seekBar.addEventListener('mousedown', (e) => {
    seekDragging = true;
    stopTimeUpdater();
    seekHandle.classList.add('active');
    seekTo(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (seekDragging) seekTo(e);
  });

  document.addEventListener('mouseup', (e) => {
    if (seekDragging) {
      seekDragging = false;
      seekHandle.classList.remove('active');
      const pct = seekTo(e);
      const newPos = pct * seek.duration;
      if (state.duration > 0) {
        window.api.music.setPosition(newPos);
      }
      // Restart CSS transition from new position
      seek.position = newPos;
      setSeekPosition(newPos, seek.duration, state.playing);
    }
  });

  // ─── Volume Bar Interaction ────────────────────────────────────────────
  function volumeTo(e) {
    const rect = volumeBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const vol = Math.round(pct * 100);
    updateVolumeUI(vol);
    return vol;
  }

  volumeBar.addEventListener('mousedown', (e) => {
    volumeDragging = true;
    volumeHandle.classList.add('active');
    state.muted = false;
    const vol = volumeTo(e);
    state.volume = vol;
    window.api.music.setVolume(vol);
  });

  document.addEventListener('mousemove', (e) => {
    if (volumeDragging) {
      const vol = volumeTo(e);
      state.volume = vol;
      window.api.music.setVolume(vol);
    }
  });

  document.addEventListener('mouseup', () => {
    if (volumeDragging) {
      volumeDragging = false;
      volumeHandle.classList.remove('active');
    }
  });

  // ─── Button Handlers ──────────────────────────────────────────────────
  btnPlayPause.addEventListener('click', () => {
    if (state.playing) window.api.music.pause();
    else window.api.music.play();
  });
  btnPrev.addEventListener('click', () => window.api.music.prev());
  btnNext.addEventListener('click', () => window.api.music.next());
  btnShuffle.addEventListener('click', () => window.api.music.toggleShuffle());
  btnRepeat.addEventListener('click', () => window.api.music.toggleRepeat());

  btnMute.addEventListener('click', () => {
    if (state.muted) {
      state.muted = false;
      window.api.music.setVolume(state.prevVolume);
      updateVolumeUI(state.prevVolume);
    } else {
      state.muted = true;
      state.prevVolume = state.volume;
      window.api.music.setVolume(0);
      updateVolumeUI(0);
    }
  });

  // ─── Window Controls ──────────────────────────────────────────────────
  btnSnap.addEventListener('click', () => window.api.window.snapBottomRight());

  if (btnPlaylistSnap) {
    btnPlaylistSnap.addEventListener('click', () => {
      const activeEl = playlistTracks.querySelector('.playlist-track.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  if (btnLock) {
    btnLock.addEventListener('click', async () => {
      const isLocked = await window.api.window.toggleLock();
      btnLock.classList.toggle('active', isLocked);
      btnLock.title = isLocked ? 'Unlock Position' : 'Lock Position';
    });
  }

  btnPin.addEventListener('click', async () => {
    const isOnTop = await window.api.window.toggleOnTop();
    btnPin.classList.toggle('active', isOnTop);
  });

  btnMinimize.addEventListener('click', () => window.api.window.minimize());
  btnClose.addEventListener('click', () => window.api.window.close());

  // ─── Transparency Slider ──────────────────────────────────────────────
  if (transparencySlider) {
    transparencySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      applyBgTransparency(val / 100);
    });
    transparencySlider.addEventListener('change', async (e) => {
      const val = parseInt(e.target.value);
      const prefs = await window.api.prefs.load();
      prefs.transparency = val;
      await window.api.prefs.save(prefs);
    });
  }

  // ─── Text Mode Toggle ────────────────────────────────────────────────
  if (btnTextMode) {
    btnTextMode.addEventListener('click', async () => {
      darkTextMode = !darkTextMode;
      applyDarkTextMode(darkTextMode);
      const prefs = await window.api.prefs.load();
      prefs.darkText = darkTextMode;
      await window.api.prefs.save(prefs);
    });
  }

  // ─── Theme Panel ──────────────────────────────────────────────────────
  btnThemes.addEventListener('click', () => {
    themeManager.toggle();
    btnThemes.classList.toggle('active', themeManager.isOpen);
  });

  btnCloseThemes.addEventListener('click', () => {
    themeManager.close();
    btnThemes.classList.remove('active');
  });

  btnInstallTheme.addEventListener('click', () => themeManager.installTheme());
  btnOpenThemesFolder.addEventListener('click', () => window.api.themes.openFolder());

  // ─── Visualizer Mode Toggle ───────────────────────────────────────────
  vizModeToggle.addEventListener('click', () => viz.nextMode());

  // ─── Lyrics Panel ────────────────────────────────────────────────────
  async function fetchLyrics() {
    const lyrics = await window.api.music.getLyrics();
    if (lyrics && lyrics.trim()) {
      lyricsContent.textContent = lyrics;
      lyricsContent.classList.remove('lyrics-placeholder');
    } else {
      lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics available for this track</p>';
    }
    state.lyricsTrack = state.track;
  }

  function toggleLyrics() {
    state.lyricsOpen = !state.lyricsOpen;
    lyricsPanel.classList.toggle('open', state.lyricsOpen);
    btnLyrics.classList.toggle('active', state.lyricsOpen);
    if (state.lyricsOpen) {
      // Close other panels
      themeManager.close();
      btnThemes.classList.remove('active');
      closeEq();
      // Fetch lyrics if track changed or first open
      if (state.track !== state.lyricsTrack) fetchLyrics();
    }
  }

  function closeLyrics() {
    state.lyricsOpen = false;
    lyricsPanel.classList.remove('open');
    btnLyrics.classList.remove('active');
  }

  btnLyrics.addEventListener('click', toggleLyrics);
  btnCloseLyrics.addEventListener('click', closeLyrics);

  // ─── Equalizer Panel ─────────────────────────────────────────────────
  const EQ_BANDS = ['31', '62', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
  const EQ_PRESETS = {
    flat:           [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rock:           [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
    pop:            [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2],
    jazz:           [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
    classical:      [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
    'bass-boost':   [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
    'treble-boost': [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
    vocal:          [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
    electronic:     [4, 3, 1, 0, -1, 1, 2, 3, 4, 5],
    acoustic:       [3, 2, 1, 0, 1, 1, 2, 3, 2, 1],
  };

  function buildEqSliders() {
    eqSliders.innerHTML = '';
    eqLabels.innerHTML = '';
    EQ_BANDS.forEach((label, i) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = -12;
      slider.max = 12;
      slider.value = state.eqBands[i];
      slider.dataset.band = i;
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'eq-band-value';
      valueDisplay.textContent = `${state.eqBands[i] > 0 ? '+' : ''}${state.eqBands[i]}dB`;

      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.eqBands[i] = val;
        valueDisplay.textContent = `${val > 0 ? '+' : ''}${val}dB`;
        eqPresetSelect.value = '';
        saveEqPrefs();
      });

      band.appendChild(valueDisplay);
      band.appendChild(slider);
      eqSliders.appendChild(band);

      const labelEl = document.createElement('span');
      labelEl.className = 'eq-label';
      labelEl.textContent = label;
      eqLabels.appendChild(labelEl);
    });
  }

  function applyEqPreset(presetName) {
    const values = EQ_PRESETS[presetName];
    if (!values) return;
    state.eqBands = [...values];
    const sliders = eqSliders.querySelectorAll('input[type="range"]');
    const displays = eqSliders.querySelectorAll('.eq-band-value');
    sliders.forEach((s, i) => {
      s.value = values[i];
    });
    displays.forEach((d, i) => {
      d.textContent = `${values[i] > 0 ? '+' : ''}${values[i]}dB`;
    });
    saveEqPrefs();
  }

  async function saveEqPrefs() {
    const prefs = await window.api.prefs.load();
    prefs.eqBands = state.eqBands;
    prefs.eqPreset = eqPresetSelect.value;
    await window.api.prefs.save(prefs);
  }

  function toggleEq() {
    state.eqOpen = !state.eqOpen;
    eqPanel.classList.toggle('open', state.eqOpen);
    btnEq.classList.toggle('active', state.eqOpen);
    if (state.eqOpen) {
      // Close other panels
      themeManager.close();
      btnThemes.classList.remove('active');
      closeLyrics();
    }
  }

  function closeEq() {
    state.eqOpen = false;
    eqPanel.classList.remove('open');
    btnEq.classList.remove('active');
  }

  buildEqSliders();

  btnEq.addEventListener('click', toggleEq);
  btnCloseEq.addEventListener('click', closeEq);
  eqPresetSelect.addEventListener('change', (e) => {
    if (e.target.value) applyEqPreset(e.target.value);
  });

  // Load saved EQ state
  (async () => {
    const p = await window.api.prefs.load();
    if (p.eqBands && p.eqBands.length === 10) {
      state.eqBands = [...p.eqBands];
      const sliders = eqSliders.querySelectorAll('input[type="range"]');
      const displays = eqSliders.querySelectorAll('.eq-band-value');
      sliders.forEach((s, i) => { s.value = state.eqBands[i]; });
      displays.forEach((d, i) => {
        d.textContent = `${state.eqBands[i] > 0 ? '+' : ''}${state.eqBands[i]}dB`;
      });
    }
    if (p.eqPreset) eqPresetSelect.value = p.eqPreset;
  })();

  // ─── Mini Mode ───────────────────────────────────────────────────────
  function updateMiniPlayerUI() {
    if (!state.miniMode) return;
    miniTrack.textContent = state.track || 'Not Playing';
    miniArtist.textContent = state.artist || '';
    if (miniIconPlay && miniIconPause) {
      miniIconPlay.style.display = state.playing ? 'none' : '';
      miniIconPause.style.display = state.playing ? '' : 'none';
    }
  }

  function enterMiniMode() {
    state.miniMode = true;
    player.classList.add('mini-mode');
    btnMini.classList.add('active');
    window.api.window.applyConstraints(200, 56, 600, 56, 320, 56);
    updateMiniPlayerUI();
  }

  function exitMiniMode() {
    state.miniMode = false;
    player.classList.remove('mini-mode');
    btnMini.classList.remove('active');
    requestAnimationFrame(() => applyWindowConstraints());
  }

  function toggleMiniMode() {
    if (state.miniMode) exitMiniMode();
    else enterMiniMode();
    // Persist
    (async () => {
      const prefs = await window.api.prefs.load();
      prefs.miniMode = state.miniMode;
      await window.api.prefs.save(prefs);
    })();
  }

  btnMini.addEventListener('click', toggleMiniMode);
  miniExpand.addEventListener('click', () => { if (state.miniMode) toggleMiniMode(); });
  miniPrev.addEventListener('click', () => window.api.music.prev());
  miniNext.addEventListener('click', () => window.api.music.next());
  miniPlayPause.addEventListener('click', () => {
    if (state.playing) window.api.music.pause();
    else window.api.music.play();
  });

  // Listen for global shortcut toggle from main process
  window.api.onToggleMiniMode(() => toggleMiniMode());

  // Restore mini mode from prefs on startup
  (async () => {
    const p = await window.api.prefs.load();
    if (p.miniMode) {
      requestAnimationFrame(() => enterMiniMode());
    }
  })();

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Don't capture shortcuts when typing in select/input
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (state.playing) window.api.music.pause();
        else window.api.music.play();
        break;
      case 'ArrowRight':
        if (e.metaKey) window.api.music.next();
        else if (state.duration > 0) window.api.music.setPosition(state.position + 5);
        break;
      case 'ArrowLeft':
        if (e.metaKey) window.api.music.prev();
        else if (state.duration > 0) window.api.music.setPosition(Math.max(0, state.position - 5));
        break;
      case 'ArrowUp':
        state.volume = Math.min(100, state.volume + 5);
        window.api.music.setVolume(state.volume);
        updateVolumeUI(state.volume);
        break;
      case 'ArrowDown':
        state.volume = Math.max(0, state.volume - 5);
        window.api.music.setVolume(state.volume);
        updateVolumeUI(state.volume);
        break;
      case 'KeyM': btnMute.click(); break;
      case 'KeyS': window.api.music.toggleShuffle(); break;
      case 'KeyR': window.api.music.toggleRepeat(); break;
      case 'KeyT':
        themeManager.toggle();
        btnThemes.classList.toggle('active', themeManager.isOpen);
        break;
      case 'KeyV': viz.nextMode(); break;
      case 'KeyD':
        if (btnTextMode) btnTextMode.click();
        break;
      case 'KeyL': toggleLyrics(); break;
      case 'KeyE': toggleEq(); break;
    }
  });
})();
