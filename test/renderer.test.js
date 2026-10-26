/**
 * Tests for renderer-side logic (app.js features)
 * Tests EQ presets, mini mode state, lyrics, HTML structure
 */

const fs = require('fs');
const path = require('path');

describe('HTML Structure', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf-8');
  });

  test('contains mini player section', () => {
    expect(html).toContain('id="mini-player"');
    expect(html).toContain('id="mini-prev"');
    expect(html).toContain('id="mini-playpause"');
    expect(html).toContain('id="mini-next"');
    expect(html).toContain('id="mini-track"');
    expect(html).toContain('id="mini-seek-bar"');
    expect(html).toContain('id="mini-seek-fill"');
    expect(html).toContain('id="mini-expand"');
    expect(html).toContain('id="mini-minimize"');
    expect(html).toContain('id="mini-close"');
    // Windowshade shows track and artist on one line, so there is no separate artist element
    expect(html).not.toContain('id="mini-artist"');
  });

  test('contains mini mode button in titlebar', () => {
    expect(html).toContain('id="btn-mini"');
    expect(html).toContain('title="Windowshade (Cmd+Shift+M)"');
  });

  test('contains lyrics panel', () => {
    expect(html).toContain('id="lyrics-panel"');
    expect(html).toContain('id="lyrics-content"');
    expect(html).toContain('id="btn-close-lyrics"');
  });

  test('contains lyrics button in bottom bar', () => {
    expect(html).toContain('id="btn-lyrics"');
  });

  test('contains equalizer panel', () => {
    expect(html).toContain('id="eq-panel"');
    expect(html).toContain('id="eq-sliders"');
    expect(html).toContain('id="eq-labels"');
    expect(html).toContain('id="eq-preset-select"');
    expect(html).toContain('id="btn-close-eq"');
  });

  test('contains all EQ presets in select', () => {
    const presets = ['flat', 'rock', 'pop', 'jazz', 'classical', 'bass-boost', 'treble-boost', 'vocal', 'electronic', 'acoustic'];
    for (const preset of presets) {
      expect(html).toContain(`value="${preset}"`);
    }
  });

  test('contains all original sections', () => {
    expect(html).toContain('id="player"');
    expect(html).toContain('id="titlebar"');
    expect(html).toContain('id="visualizer"');
    expect(html).toContain('id="marquee-text"');
    expect(html).toContain('id="artwork-img"');
    expect(html).toContain('id="seek-bar"');
    expect(html).toContain('id="btn-playpause"');
    expect(html).toContain('id="volume-bar"');
    expect(html).toContain('id="theme-panel"');
    expect(html).toContain('id="btn-themes"');
    expect(html).toContain('id="btn-eq"');
  });

  test('loads all script files', () => {
    expect(html).toContain('src="js/visualizer.js"');
    expect(html).toContain('src="js/theme-manager.js"');
    expect(html).toContain('src="js/app.js"');
  });
});

describe('CSS Styles', () => {
  let css;

  beforeAll(() => {
    css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'base.css'), 'utf-8');
  });

  test('contains lyrics panel styles', () => {
    expect(css).toContain('.lyrics-panel');
    expect(css).toContain('.lyrics-panel.open');
    expect(css).toContain('.lyrics-panel-header');
    expect(css).toContain('.lyrics-content');
    expect(css).toContain('.lyrics-placeholder');
    expect(css).toContain('.lyrics-panel-close');
  });

  test('contains EQ panel styles', () => {
    expect(css).toContain('.eq-panel');
    expect(css).toContain('.eq-panel.open');
    expect(css).toContain('.eq-sliders');
    expect(css).toContain('.eq-band');
    expect(css).toContain('.eq-labels');
    expect(css).toContain('.eq-preset-select');
  });

  test('contains mini player styles', () => {
    expect(css).toContain('.mini-player');
    expect(css).toContain('.player.mini-mode');
    expect(css).toContain('.mini-ctrl');
    expect(css).toContain('.mini-playpause');
    expect(css).toContain('.mini-track-info');
    expect(css).toContain('.mini-track');
    expect(css).toContain('.mini-drag');
    expect(css).toContain('.mini-title');
    expect(css).toContain('.mini-seek-bar');
    expect(css).toContain('.mini-seek-fill');
    expect(css).toContain('.mini-buttons');
    expect(css).toContain('.mini-expand');
    expect(css).not.toContain('.mini-artist');
  });

  test('mini mode hides all main sections', () => {
    expect(css).toContain('.player.mini-mode .visualizer-container');
    expect(css).toContain('.player.mini-mode .display');
    expect(css).toContain('.player.mini-mode .artwork-container');
    expect(css).toContain('.player.mini-mode .seek-container');
    expect(css).toContain('.player.mini-mode .controls-volume-group');
    expect(css).toContain('.player.mini-mode .bottom-bar');
  });

  test('lyrics/eq panels use theme variables', () => {
    // Panels should use existing CSS custom properties, not hardcoded colors
    expect(css).toMatch(/\.lyrics-panel\s*\{[^}]*var\(--panel-bg\)/);
    expect(css).toMatch(/\.eq-panel\s*\{[^}]*var\(--panel-bg\)/);
  });

  test('contains all original base styles', () => {
    expect(css).toContain('.player');
    expect(css).toContain('.titlebar');
    expect(css).toContain('.visualizer-container');
    expect(css).toContain('.display');
    expect(css).toContain('.artwork-container');
    expect(css).toContain('.seek-container');
    expect(css).toContain('.controls');
    expect(css).toContain('.volume-container');
    expect(css).toContain('.bottom-bar');
    expect(css).toContain('.theme-panel');
  });
});

describe('App.js Logic', () => {
  let appCode;

  beforeAll(() => {
    appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');
  });

  describe('Element References', () => {
    test('declares all new element refs', () => {
      const refs = [
        'btnMini', 'btnLyrics', 'lyricsPanel', 'lyricsContent', 'btnCloseLyrics',
        'eqPanel', 'eqSliders', 'eqLabels', 'eqPresetSelect', 'btnCloseEq',
        'miniPlayer', 'miniTrack', 'miniPrev', 'miniNext',
        'miniPlayPause', 'miniExpand', 'miniIconPlay', 'miniIconPause',
        'miniSeekBar', 'miniSeekFill', 'miniCloseBtn', 'miniMinimizeBtn', 'miniPinBtn',
      ];
      for (const ref of refs) {
        expect(appCode).toContain(`const ${ref}`);
      }
      expect(appCode).not.toContain('miniArtist');
    });
  });

  describe('State Fields', () => {
    test('contains notification tracking state', () => {
      expect(appCode).toContain("notifiedTrack: ''");
    });

    test('contains lyrics state fields', () => {
      expect(appCode).toContain('lyricsOpen: false');
      expect(appCode).toContain("lyricsTrack: ''");
    });

    test('contains EQ state fields', () => {
      expect(appCode).toContain('eqOpen: false');
      expect(appCode).toContain('eqBands: [0,0,0,0,0,0,0,0,0,0]');
    });

    test('contains mini mode state', () => {
      expect(appCode).toContain('miniMode: false');
    });
  });

  describe('EQ Presets', () => {
    test('defines all 10 EQ presets', () => {
      const presets = ['flat', 'rock', 'pop', 'jazz', 'classical', 'bass-boost', 'treble-boost', 'vocal', 'electronic', 'acoustic'];
      for (const preset of presets) {
        expect(appCode).toContain(`${preset.includes('-') ? `'${preset}'` : preset}:`);
      }
    });

    test('defines 10-band EQ labels', () => {
      const bands = ['31', '62', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
      for (const band of bands) {
        expect(appCode).toContain(`'${band}'`);
      }
    });

    test('each preset has exactly 10 values', () => {
      // Extract preset arrays from code
      const presetMatch = appCode.match(/flat:\s*\[([\d\s,\-]+)\]/);
      expect(presetMatch).toBeTruthy();
      const values = presetMatch[1].split(',').map(v => v.trim());
      expect(values.length).toBe(10);
    });
  });

  describe('Lyrics Functions', () => {
    test('defines fetchLyrics function', () => {
      expect(appCode).toContain('async function fetchLyrics()');
    });

    test('defines toggleLyrics function', () => {
      expect(appCode).toContain('function toggleLyrics()');
    });

    test('defines closeLyrics function', () => {
      expect(appCode).toContain('function closeLyrics()');
    });

    test('fetchLyrics calls music.getLyrics API', () => {
      expect(appCode).toContain('window.api.music.getLyrics()');
    });

    test('toggleLyrics closes other panels', () => {
      expect(appCode).toMatch(/toggleLyrics[\s\S]*?themeManager\.close\(\)/);
      expect(appCode).toMatch(/toggleLyrics[\s\S]*?closeEq\(\)/);
    });
  });

  describe('EQ Functions', () => {
    test('defines buildEqSliders function', () => {
      expect(appCode).toContain('function buildEqSliders()');
    });

    test('defines applyEqPreset function', () => {
      expect(appCode).toContain('function applyEqPreset(presetName)');
    });

    test('defines toggleEq function', () => {
      expect(appCode).toContain('function toggleEq()');
    });

    test('defines closeEq function', () => {
      expect(appCode).toContain('function closeEq()');
    });

    test('EQ state is persisted to prefs', () => {
      expect(appCode).toContain('prefs.eqBands = state.eqBands');
    });
  });

  describe('Mini Mode Functions', () => {
    test('defines enterMiniMode function', () => {
      expect(appCode).toContain('function enterMiniMode()');
    });

    test('defines exitMiniMode function', () => {
      expect(appCode).toContain('function exitMiniMode()');
    });

    test('defines toggleMiniMode function', () => {
      expect(appCode).toContain('function toggleMiniMode()');
    });

    test('defines updateMiniPlayerUI function', () => {
      expect(appCode).toContain('function updateMiniPlayerUI()');
    });

    test('enterMiniMode applies correct window constraints for mini strip', () => {
      expect(appCode).toMatch(/enterMiniMode[\s\S]*?applyConstraints\(280, 28, 600, 28, 320, 28\)/);
    });

    test('updateMiniPlayerUI shows track and artist on one line', () => {
      expect(appCode).toMatch(/function updateMiniPlayerUI\(\)[\s\S]*?state\.artist \? ' — ' \+ state\.artist : ''/);
      expect(appCode).toMatch(/function updateMiniPlayerUI\(\)[\s\S]*?miniTrack\.textContent = label/);
    });

    test('exitMiniMode restores normal constraints', () => {
      expect(appCode).toMatch(/exitMiniMode[\s\S]*?applyWindowConstraints\(\)/);
    });

    test('mini mode is persisted to prefs', () => {
      expect(appCode).toContain('prefs.miniMode = state.miniMode');
    });

    test('mini mode is restored from prefs on startup', () => {
      expect(appCode).toMatch(/if\s*\(p\.miniMode\)/);
    });

    test('listens for IPC toggle-mini-mode event', () => {
      expect(appCode).toContain('window.api.onToggleMiniMode');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('adds L key for lyrics', () => {
      expect(appCode).toMatch(/case\s*'KeyL':\s*toggleLyrics\(\)/);
    });

    test('adds E key for equalizer', () => {
      expect(appCode).toMatch(/case\s*'KeyE':\s*toggleEq\(\)/);
    });

    test('skips shortcuts when in input/select elements', () => {
      expect(appCode).toContain("e.target.tagName === 'SELECT'");
      expect(appCode).toContain("e.target.tagName === 'INPUT'");
    });

    test('retains all original shortcuts', () => {
      expect(appCode).toContain("case 'Space':");
      expect(appCode).toContain("case 'ArrowRight':");
      expect(appCode).toContain("case 'ArrowLeft':");
      expect(appCode).toContain("case 'ArrowUp':");
      expect(appCode).toContain("case 'ArrowDown':");
      expect(appCode).toContain("case 'KeyM':");
      expect(appCode).toContain("case 'KeyS':");
      expect(appCode).toContain("case 'KeyR':");
      expect(appCode).toContain("case 'KeyT':");
      expect(appCode).toContain("case 'KeyV':");
      expect(appCode).toContain("case 'KeyD':");
    });
  });

  describe('Poll Integration', () => {
    test('sends notification on track change', () => {
      expect(appCode).toContain('window.api.notifications.trackChange');
    });

    test('updates tray on track change', () => {
      expect(appCode).toContain('window.api.tray.updateTrack');
    });

    test('refreshes lyrics when panel is open', () => {
      expect(appCode).toContain('if (state.lyricsOpen) fetchLyrics()');
    });

    test('calls updateMiniPlayerUI from updateUI', () => {
      expect(appCode).toMatch(/function updateUI[\s\S]*?updateMiniPlayerUI\(\)/);
    });
  });

  describe('Panel Mutual Exclusion', () => {
    test('lyrics toggle closes EQ panel', () => {
      expect(appCode).toMatch(/toggleLyrics[\s\S]*?closeEq\(\)/);
    });

    test('EQ toggle closes lyrics panel', () => {
      expect(appCode).toMatch(/toggleEq[\s\S]*?closeLyrics\(\)/);
    });

    test('lyrics toggle closes theme panel', () => {
      expect(appCode).toMatch(/toggleLyrics[\s\S]*?themeManager\.close\(\)/);
    });

    test('EQ toggle closes theme panel', () => {
      expect(appCode).toMatch(/toggleEq[\s\S]*?themeManager\.close\(\)/);
    });
  });
});

describe('Bit rate and sample rate display', () => {
  let html, appCode, css, formatBitRate, formatSampleRate;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf-8');
    appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');
    css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'base.css'), 'utf-8');
    const grab = (name) => appCode.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n  }\\n`))[0];
    ({ formatBitRate, formatSampleRate } = new Function(
      `${grab('formatBitRate')}${grab('formatSampleRate')} return { formatBitRate, formatSampleRate };`
    )());
  });

  test('markup no longer hardcodes 256 and 44', () => {
    expect(html).toMatch(/id="display-kbps">--</);
    expect(html).toMatch(/id="display-khz">--</);
  });

  test('STEREO is static and not lit', () => {
    expect(html).toContain('<span class="stereo-indicator">STEREO</span>');
  });

  test('values reserve width so 4-digit numbers do not shift the layout', () => {
    expect(css).toMatch(/#display-kbps\s*{\s*min-width: 4ch/);
  });

  test('updateUI writes the rates from state', () => {
    expect(appCode).toMatch(/function updateUI[\s\S]*?formatBitRate\(newState\.bitRate\)[\s\S]*?formatSampleRate\(newState\.sampleRate\)/);
  });

  test('formatBitRate rounds, and shows -- for unknown values', () => {
    expect(formatBitRate(256)).toBe('256');
    expect(formatBitRate(1411.2)).toBe('1411');
    expect(formatBitRate(99999)).toBe('9999');
    for (const bad of [0, null, undefined, NaN, -5, 'x']) expect(formatBitRate(bad)).toBe('--');
  });

  test('formatSampleRate shows kHz without trailing zeros', () => {
    expect(formatSampleRate(44100)).toBe('44.1');
    expect(formatSampleRate(48000)).toBe('48');
    expect(formatSampleRate(96000)).toBe('96');
    expect(formatSampleRate(192000)).toBe('192');
    for (const bad of [0, null, undefined, NaN, -5, 'x']) expect(formatSampleRate(bad)).toBe('--');
  });
});

describe('Windowshade Bar', () => {
  let html, css, appCode, miniButtons;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf-8');
    css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'base.css'), 'utf-8');
    appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');
    miniButtons = html.match(/<div class="mini-buttons">([\s\S]*?)<\/div>/)[1];
  });

  test('has a pin button among the window buttons', () => {
    expect(miniButtons).toContain('id="mini-pin"');
    expect(miniButtons).toContain('title="Always on Top"');
  });

  test('pin uses the same always-on-top toggle as the titlebar pin', () => {
    expect(appCode).toContain("const miniPinBtn = $('#mini-pin')");
    expect(appCode).toMatch(/async function toggleAlwaysOnTop\(\)[\s\S]*?window\.api\.window\.toggleOnTop\(\)[\s\S]*?btnPin\.classList\.toggle\('active', isOnTop\)[\s\S]*?miniPinBtn\.classList\.toggle\('active', isOnTop\)/);
    expect(appCode).toContain("btnPin.addEventListener('click', toggleAlwaysOnTop)");
    expect(appCode).toContain("miniPinBtn.addEventListener('click', toggleAlwaysOnTop)");
  });

  test('pin shows the same active state as the titlebar pin', () => {
    expect(css).toMatch(/\.btn-pin\.active\s*\{[^}]*color:\s*var\(--accent\)/);
    expect(css).toMatch(/\.mini-pin\.active\s*\{[^}]*color:\s*var\(--accent\)/);
  });

  test('minimum width fits every fixed item, so nothing clips', () => {
    const [, minW, defaultW] = appCode.match(/applyConstraints\((\d+), 28, 600, 28, (\d+), 28\)/).map(Number);
    const buttons = (miniButtons.match(/class="mini-ctrl/g) || []).length;
    // border 2 + padding 16 + ARGON label ~35 (widest theme font) + prev/play/next 18+20+18
    // + seek 48 + window buttons (18px each, 2px apart) + 6 gaps of 5px between bar items
    const fixed = 2 + 16 + 35 + 56 + 48 + (buttons * 18 + (buttons - 1) * 2) + 6 * 5;
    expect(minW).toBeGreaterThanOrEqual(fixed);
    expect(defaultW).toBeGreaterThan(minW);
  });

  test('seek bar uses the theme bar colors', () => {
    expect(css).toMatch(/\.mini-seek-bar\s*\{[^}]*background:\s*var\(--bar-bg\)/);
    expect(css).toMatch(/\.mini-seek-fill\s*\{[^}]*background:\s*var\(--bar-fill\)/);
    expect(css).not.toContain('--seek-bg');
  });

  test('seek bar has a larger click area that stays out of the drag region', () => {
    expect(css).toMatch(/\.mini-seek-bar::before\s*\{[^}]*top:\s*-8px[^}]*bottom:\s*-8px[^}]*-webkit-app-region:\s*no-drag/);
  });

  test('seek click restarts the local seek animation from the new position', () => {
    expect(appCode).toMatch(/miniSeekBar\.addEventListener\('click'[\s\S]*?window\.api\.music\.setPosition\(pos\);[\s\S]*?setSeekPosition\(pos, state\.duration, state\.playing\)/);
  });

  test('close hover is tied to a class, not to the button position', () => {
    expect(miniButtons).toContain('class="mini-ctrl mini-close" id="mini-close"');
    expect(css).toMatch(/\.mini-close:hover\s*\{[^}]*#ff453a/);
    expect(css).not.toContain(':last-child:hover');
  });

  test('user-facing text calls it Windowshade', () => {
    expect(html).toContain('title="Exit Windowshade"');
    expect(html).not.toContain('Mini Mode');
  });
});

describe('Security', () => {
  let html, themeManagerCode;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf-8');
    themeManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'theme-manager.js'), 'utf-8');
  });

  test('index.html has Content-Security-Policy', () => {
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("script-src 'self'");
  });

  test('theme-manager escapes HTML in theme name/author', () => {
    expect(themeManagerCode).toContain('_escapeHtml(theme.name');
    expect(themeManagerCode).toContain('_escapeHtml(theme.author');
  });

  test('theme-manager sanitizes color values', () => {
    expect(themeManagerCode).toContain('_sanitizeColor');
  });

  test('main.js has sandbox enabled', () => {
    const mainCode = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8');
    expect(mainCode).toContain('sandbox: true');
  });

  test('preload.js does not leak IPC event object', () => {
    const preloadCode = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf-8');
    // Should wrap callback to strip event
    expect(preloadCode).toContain("ipcRenderer.on('toggle-mini-mode', () => callback())");
  });

  test('main.js validates themes:load themeId against path traversal', () => {
    const mainCode = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8');
    expect(mainCode).toMatch(/\/\\\\]|\\\.\\\./);  // Checks for path traversal regex
  });
});

describe('README', () => {
  let readme;

  beforeAll(() => {
    readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf-8');
  });

  test('contains project name', () => {
    expect(readme).toContain('# Argon');
  });

  test('describes all 6 new features', () => {
    expect(readme).toContain('Windowshade Mode');
    expect(readme).toContain('Lyrics Display');
    expect(readme).toContain('Equalizer');
    expect(readme).toContain('Global Shortcuts');
    expect(readme).toContain('Tray');
    expect(readme).toContain('Notifications');
  });

  test('contains install instructions', () => {
    expect(readme).toContain('npm install');
    expect(readme).toContain('npm start');
  });

  test('contains keyboard shortcuts tables', () => {
    expect(readme).toContain('In-App Shortcuts');
    expect(readme).toContain('Global Shortcuts');
    expect(readme).toContain('Cmd + Shift + M');
  });

  test('contains tech stack', () => {
    expect(readme).toContain('Electron');
    expect(readme).toContain('AppleScript');
  });

  test('contains MIT license', () => {
    expect(readme).toContain('MIT');
  });
});
