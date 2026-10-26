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

  test('contains PL button in the bottom bar, next to EQ', () => {
    expect(html).toMatch(/id="btn-playlist"[^>]*title="Playlist \(P\)"/);
    expect(html.indexOf('id="btn-playlist"')).toBeGreaterThan(html.indexOf('class="bottom-bar"'));
    expect(html.indexOf('id="btn-playlist"')).toBeLessThan(html.indexOf('id="btn-eq"'));
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

  test('PL button overrides the theme playlist default and mini mode still wins', () => {
    expect(css).toContain('.player.playlist-forced-on .playlist-container { display: flex !important; }');
    expect(css).toContain('.player.playlist-forced-off .playlist-container { display: none !important; }');
    // Equal specificity and both !important, so the later rule wins: mini mode must come last
    expect(css.indexOf('.player.playlist-forced-off')).toBeLessThan(css.indexOf('.player.mini-mode .playlist-container'));
  });

  test('forcing the playlist on gives the added height to the playlist, and a wide artwork cannot crush it', () => {
    expect(css).toMatch(/\.player\.playlist-forced-on \.artwork-container\s*\{[^}]*flex-grow:\s*0;[^}]*flex-shrink:\s*1;[^}]*min-height:\s*0;/);
    expect(css).toMatch(/\.player\.playlist-forced-on \.playlist-container\s*\{[^}]*min-height:\s*180px;[^}]*flex-shrink:\s*0;/);
  });

  test('themes can hide the PL button with --show-playlist-toggle', () => {
    expect(css).toContain('--show-playlist-toggle: flex;');
    expect(css).toMatch(/#btn-playlist\s*\{\s*display:\s*var\(--show-playlist-toggle\)/);
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

  describe('Marquee Click', () => {
    // Run the real functions from app.js against a stand-in for the marquee element
    function makeMarquee(classes) {
      const set = new Set(classes);
      return {
        classList: {
          contains: (c) => set.has(c),
          add: (...cs) => cs.forEach((c) => set.add(c)),
          remove: (...cs) => cs.forEach((c) => set.delete(c)),
          toggle(c) { if (set.has(c)) { set.delete(c); return false; } set.add(c); return true; },
        },
        getAnimations: () => [],
        has: (c) => set.has(c),
      };
    }
    let load;

    beforeAll(() => {
      const grab = (re) => appCode.match(re)[0];
      const src = [
        grab(/function toggleMarqueePause[\s\S]*?\n  }\n/),
        grab(/function reverseMarquee[\s\S]*?\n  }\n/),
        'return { toggleMarqueePause, reverseMarquee };',
      ].join('\n');
      load = (marqueeText) => new Function('marqueeText', src)(marqueeText);
    });

    test('click pauses a scrolling title and a second click resumes it', () => {
      const m = makeMarquee(['scrolling']);
      const { toggleMarqueePause } = load(m);
      toggleMarqueePause();
      expect(m.has('paused')).toBe(true);
      toggleMarqueePause();
      expect(m.has('paused')).toBe(false);
    });

    test('a title that fits does not react to clicks', () => {
      const m = makeMarquee([]);
      const { toggleMarqueePause, reverseMarquee } = load(m);
      toggleMarqueePause();
      reverseMarquee();
      expect(m.has('paused')).toBe(false);
      expect(m.has('reversed')).toBe(false);
    });

    test('Shift+click reverses a scrolling title and flips it back', () => {
      const m = makeMarquee(['scrolling']);
      const { reverseMarquee } = load(m);
      reverseMarquee();
      expect(m.has('reversed')).toBe(true);
      reverseMarquee();
      expect(m.has('reversed')).toBe(false);
    });

    test('reversing keeps the text where it is', () => {
      const m = makeMarquee(['scrolling']);
      const anim = { effect: { getComputedTiming: () => ({ progress: 0.25, duration: 10000 }) }, currentTime: 0 };
      m.getAnimations = () => [anim];
      const { reverseMarquee } = load(m);
      reverseMarquee();
      expect(anim.currentTime).toBe(7500);
      anim.effect.getComputedTiming = () => ({ progress: 0.25, duration: 10000 });
      reverseMarquee();
      expect(anim.currentTime).toBe(2500);
    });

    test('when the class change replaces the animation, the clock is set on the new one', () => {
      const m = makeMarquee(['scrolling']);
      const before = { effect: { getComputedTiming: () => ({ progress: 0.25, duration: 10000 }) }, currentTime: 0 };
      const after = { effect: {}, currentTime: 0 };
      let calls = 0;
      m.getAnimations = () => (calls++ === 0 ? [before] : [after]);
      const { reverseMarquee } = load(m);
      reverseMarquee();
      expect(after.currentTime).toBe(7500);
      expect(before.currentTime).toBe(0);
    });

    test('a progress that is not a number leaves the clock alone', () => {
      const m = makeMarquee(['scrolling']);
      const anim = { effect: { getComputedTiming: () => ({ progress: null, duration: 10000 }) }, currentTime: 1234 };
      m.getAnimations = () => [anim];
      const { reverseMarquee } = load(m);
      reverseMarquee();
      expect(anim.currentTime).toBe(1234);
      expect(m.has('reversed')).toBe(true);
    });

    test('no animation after the class change is not an error', () => {
      const m = makeMarquee(['scrolling']);
      const anim = { effect: { getComputedTiming: () => ({ progress: 0.5, duration: 10000 }) }, currentTime: 0 };
      let calls = 0;
      m.getAnimations = () => (calls++ === 0 ? [anim] : []);
      const { reverseMarquee } = load(m);
      expect(() => reverseMarquee()).not.toThrow();
    });

    test('a new title resets paused and reversed, and starts paused for reduced motion', () => {
      expect(appCode).toMatch(/function setMarquee[\s\S]*?classList\.remove\('scrolling', 'paused', 'reversed'\)/);
      expect(appCode).toMatch(/prefers-reduced-motion: reduce[\s\S]*?classList\.add\('paused'\)/);
    });

    test('clicks on the marquee box are wired up', () => {
      expect(appCode).toMatch(/marqueeText\.parentElement\.addEventListener\('click'[\s\S]*?e\.shiftKey/);
    });

    test('CSS pauses the animation and reverses its direction', () => {
      const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'base.css'), 'utf-8');
      expect(css).toMatch(/\.marquee-content\.scrolling\.paused\s*\{[^}]*animation-play-state:\s*paused/);
      expect(css).toMatch(/\.marquee-content\.scrolling\.reversed\s*\{\s*animation-direction:\s*reverse/);
    });
  });

  describe('Playlist Toggle', () => {
    const { resolvePlaylistVisible, playlistWindowHeights } = require('../src/js/playlist-layout.js');
    const base = { minH: 520, maxH: 1200, themeDefault: false, visible: true, restoreH: null, keepSize: true };

    test('theme default applies when there is no override, an override beats it', () => {
      expect(resolvePlaylistVisible(true, undefined)).toBe(true);
      expect(resolvePlaylistVisible(false, undefined)).toBe(false);
      expect(resolvePlaylistVisible(false, true)).toBe(true);
      expect(resolvePlaylistVisible(true, false)).toBe(false);
    });

    test('opening grows a short window to min height + 220', () => {
      const r = playlistWindowHeights({ ...base, curH: 520 });
      expect(r).toEqual({ minHeight: 740, targetHeight: 740, restoreH: 520 });
    });

    test('opening never shrinks a window the user made taller', () => {
      const r = playlistWindowHeights({ ...base, curH: 1000 });
      expect(r.targetHeight).toBe(1000);
      expect(r.minHeight).toBe(740);
      expect(r.restoreH).toBe(1000);
    });

    test('opening is capped at the theme max height', () => {
      expect(playlistWindowHeights({ ...base, maxH: 600, curH: 520 }).targetHeight).toBe(600);
      expect(playlistWindowHeights({ ...base, minH: 500, maxH: 500, curH: 500 })).toMatchObject({ minHeight: 500, targetHeight: 500 });
    });

    test('closing restores the height from before it opened', () => {
      const r = playlistWindowHeights({ ...base, visible: false, curH: 740, restoreH: 1000 });
      expect(r).toEqual({ minHeight: 520, targetHeight: 1000, restoreH: null });
    });

    test('a theme that shows the playlist, or a hidden playlist with nothing saved, keeps the current height', () => {
      expect(playlistWindowHeights({ ...base, themeDefault: true, visible: true, curH: 900 }))
        .toEqual({ minHeight: 520, targetHeight: 900, restoreH: null });
      expect(playlistWindowHeights({ ...base, visible: false, curH: 900 }).targetHeight).toBe(900);
    });

    test('after a theme load the window starts from the theme base height', () => {
      const open = playlistWindowHeights({ ...base, keepSize: false, curH: 1000, restoreH: 1000 });
      expect(open).toEqual({ minHeight: 740, targetHeight: 740, restoreH: 520 });
      expect(playlistWindowHeights({ ...base, keepSize: false, visible: false, curH: 1000 }).targetHeight).toBe(520);
    });

    test('a restored height is held inside the theme limits', () => {
      expect(playlistWindowHeights({ ...base, visible: false, curH: 740, restoreH: 300 }).targetHeight).toBe(520);
      expect(playlistWindowHeights({ ...base, visible: false, curH: 740, restoreH: 5000 }).targetHeight).toBe(1200);
    });

    describe('in the app', () => {
      const { loadApp } = require('./helpers/appHarness');
      const press = (app, init = {}) => app.keydown({ code: 'KeyP', ...init });

      test('stretch to 1000, PL opens at 1000, PL again goes back to 1000', async () => {
        const app = await loadApp({ innerHeight: 1000 });
        app.runFrames();
        app.win.innerHeight = 1000; // the user stretched the window after startup
        app.listeners.byId['#btn-playlist'].click();
        expect(app.lastResize()).toMatchObject({ minH: 740, targetH: 1000 });
        expect(app.player.classList.contains('playlist-forced-on')).toBe(true);
        app.listeners.byId['#btn-playlist'].click();
        expect(app.lastResize()).toMatchObject({ minH: 520, targetH: 1000 });
        expect(app.player.classList.contains('playlist-forced-on')).toBe(false);
      });

      test('a short window grows by the playlist, and closing shrinks it back', async () => {
        const app = await loadApp();
        app.runFrames();
        press(app);
        expect(app.lastResize()).toMatchObject({ minH: 740, targetH: 740 });
        press(app);
        expect(app.lastResize()).toMatchObject({ minH: 520, targetH: 520 });
      });

      test('a theme change drops the saved height', async () => {
        const app = await loadApp();
        app.runFrames();
        app.win.innerHeight = 900;
        press(app); // opens at 900, saves 900
        app.listeners.window.themechange.forEach((fn) => fn({ detail: { themeId: 'other' } }));
        app.runFrames(); // theme load resets to the base height + playlist
        expect(app.lastResize()).toMatchObject({ targetH: 740 });
        press(app);
        expect(app.lastResize()).toMatchObject({ targetH: 520 }); // not the 900 from the old theme
      });

      test('holding P toggles once and saves once', async () => {
        const app = await loadApp();
        app.runFrames();
        press(app);
        press(app, { repeat: true });
        press(app, { repeat: true });
        press(app, { repeat: true });
        expect(app.player.classList.contains('playlist-forced-on')).toBe(true);
        expect(app.calls.prefsSave).toEqual([{ playlistVisible: true }]);
        press(app); // a fresh press toggles again
        expect(app.calls.prefsSave).toEqual([{ playlistVisible: true }, { playlistVisible: false }]);
      });

      test('the toggle saves only playlistVisible, never a snapshot of the other prefs', async () => {
        const app = await loadApp({ prefs: { theme: 'x', transparency: 40 } });
        app.runFrames();
        press(app);
        expect(app.calls.prefsSave).toEqual([{ playlistVisible: true }]);
      });

      test('P is ignored in mini mode', async () => {
        const app = await loadApp({ prefs: { miniMode: true } });
        app.runFrames();
        const before = app.calls.prefsSave.length;
        press(app);
        expect(app.calls.prefsSave.length).toBe(before);
      });

      test('a saved override is applied before the first resize', async () => {
        const app = await loadApp({ prefs: { playlistVisible: true } });
        expect(app.calls.applyConstraints).toEqual([]); // nothing resized before the pref is known
        app.runFrames();
        expect(app.calls.applyConstraints).toHaveLength(1);
        expect(app.lastResize()).toMatchObject({ minH: 740, targetH: 740 });
        expect(app.player.classList.contains('playlist-forced-on')).toBe(true);
      });

      test('with no saved override the first resize is the theme size', async () => {
        const app = await loadApp();
        app.runFrames();
        expect(app.calls.applyConstraints).toHaveLength(1);
        expect(app.lastResize()).toMatchObject({ targetW: 320, targetH: 520 });
      });
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

describe('Favorite button', () => {
  let html, appCode, css, themeGuide;

  beforeAll(() => {
    const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf-8');
    html = read('src', 'index.html');
    appCode = read('src', 'js', 'app.js');
    css = read('src', 'styles', 'base.css');
    themeGuide = read('THEME_GUIDE.md');
  });

  test('has an accessible name and pressed state, and starts hidden', () => {
    expect(html).toMatch(/<button[^>]*id="btn-favorite"[^>]*aria-label="Favorite"[^>]*aria-pressed="false"[^>]*hidden/);
  });

  test('themes can hide it with --show-favorite', () => {
    expect(css).toMatch(/--show-favorite:\s*flex/);
    expect(css).toMatch(/\.favorite-btn\s*{[^}]*display:\s*var\(--show-favorite\)/);
    expect(css).toMatch(/\.favorite-btn\[hidden\]\s*{\s*display:\s*none/);
    expect(themeGuide).toContain('--show-favorite');
  });

  test('favorite.js loads before app.js', () => {
    expect(html.indexOf('src="js/favorite.js"')).toBeGreaterThan(-1);
    expect(html.indexOf('src="js/favorite.js"')).toBeLessThan(html.indexOf('src="js/app.js"'));
  });

  test('the heart is hidden while stopped or without a track ID', () => {
    expect(appCode).toContain('btnFavorite.hidden = !state.persistentId');
  });
});

describe('Favorite controller', () => {
  const { createFavoriteController, isFavoriteKey } = require('../src/js/favorite.js');

  // A toggle call the test settles by hand, so the track can change while it is in flight
  function setup() {
    const painted = [];
    const calls = [];
    const fav = createFavoriteController({
      toggle: (id) => new Promise((resolve, reject) => calls.push({ id, resolve, reject })),
      paint: (v) => painted.push(v),
    });
    return { fav, painted, calls };
  }

  test('click updates the heart at once and keeps the result', async () => {
    const { fav, painted, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    expect(fav.favorited).toBe(true);
    expect(calls.map((c) => c.id)).toEqual(['A']);
    calls[0].resolve(true);
    await done;
    expect(fav.favorited).toBe(true);
    expect(painted).toEqual([false, true, true]);
  });

  test('does nothing without a track ID', async () => {
    const { fav, calls } = setup();
    fav.update('', false);
    await fav.click();
    expect(calls).toHaveLength(0);
  });

  test('a second click during the call is ignored', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    await fav.click();
    expect(calls).toHaveLength(1);
    calls[0].resolve(true);
    await done;
  });

  test('rolls back when the call fails', async () => {
    const { fav, calls } = setup();
    fav.update('A', true);
    const done = fav.click();
    expect(fav.favorited).toBe(false);
    calls[0].reject(new Error('Music not running'));
    await done;
    expect(fav.favorited).toBe(true);
  });

  test('rolls back when Music says the track is stale', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    calls[0].resolve('stale');
    await done;
    expect(fav.favorited).toBe(false);
  });

  test('the poll does not overwrite the heart while a toggle is in flight on the same track', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    fav.update('A', false);
    expect(fav.favorited).toBe(true);
    calls[0].resolve(true);
    await done;
    expect(fav.favorited).toBe(true);
  });

  test('a track change during the call shows the new track right away', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    fav.update('B', true);
    expect(fav.id).toBe('B');
    expect(fav.favorited).toBe(true);
    calls[0].resolve(true);
    await done;
    expect(fav.favorited).toBe(true);
  });

  test('a stale result from the old track does not repaint the new one', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    fav.update('B', true);
    calls[0].resolve('stale');
    await done;
    expect(fav.favorited).toBe(true);
    // The next click sends B's ID and flips B from its real value
    const next = fav.click();
    expect(calls[1].id).toBe('B');
    expect(fav.favorited).toBe(false);
    calls[1].resolve(false);
    await next;
  });

  test('a failure from the old track does not repaint the new one', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    fav.update('B', true);
    calls[0].reject(new Error('boom'));
    await done;
    expect(fav.favorited).toBe(true);
  });

  test('after the call the poll drives the heart again', async () => {
    const { fav, calls } = setup();
    fav.update('A', false);
    const done = fav.click();
    calls[0].resolve(true);
    await done;
    fav.update('A', false);
    expect(fav.favorited).toBe(false);
  });

  test('F toggles, but not on key repeat or with Cmd/Ctrl/Alt held', () => {
    expect(isFavoriteKey({ code: 'KeyF' })).toBe(true);
    expect(isFavoriteKey({ code: 'KeyF', repeat: true })).toBe(false);
    expect(isFavoriteKey({ code: 'KeyF', metaKey: true })).toBe(false);
    expect(isFavoriteKey({ code: 'KeyF', ctrlKey: true })).toBe(false);
    expect(isFavoriteKey({ code: 'KeyF', altKey: true })).toBe(false);
    expect(isFavoriteKey({ code: 'KeyG' })).toBe(false);
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

  describe('double-click toggle', () => {
    test('titlebar label and windowshade label have ids to listen on', () => {
      expect(html).toMatch(/<span class="titlebar-text" id="titlebar-text"/);
      expect(html).toMatch(/<span class="mini-title" id="mini-title"/);
    });

    test('labels are no-drag islands, since drag regions swallow DOM mouse events', () => {
      expect(css).toMatch(/\.titlebar-text\s*\{[^}]*-webkit-app-region:\s*no-drag/);
      expect(css).toMatch(/\.mini-title\s*\{[^}]*-webkit-app-region:\s*no-drag/);
      expect(css).not.toMatch(/\.mini-title\s*\{[^}]*pointer-events:\s*none/);
    });

    test('the drag regions still cover the bars', () => {
      expect(css).toMatch(/\.titlebar-drag\s*\{[^}]*-webkit-app-region:\s*drag/);
      expect(css).toMatch(/\.mini-drag\s*\{[^}]*-webkit-app-region:\s*drag/);
    });

    test('double-clicking the titlebar label enters windowshade, the strip label exits', () => {
      expect(appCode).toMatch(/\$\('#titlebar-text'\)\.addEventListener\('dblclick', \(\) => \{ if \(!state\.miniMode\) toggleMiniMode\(\); \}\)/);
      expect(appCode).toMatch(/\$\('#mini-title'\)\.addEventListener\('dblclick', \(\) => \{ if \(state\.miniMode\) toggleMiniMode\(\); \}\)/);
    });
  });
});

describe('Time Display Toggle', () => {
  let html, css, appCode, fns;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf-8');
    css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'base.css'), 'utf-8');
    appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');
    // Pull the pure helpers out of app.js so the real code is what gets tested
    const names = ['formatTime', 'formatTimeReadout', 'nextTimeMode', 'parseTimeMode', 'parkSeekWithoutDuration'];
    const grab = (name) => appCode.match(new RegExp(`  function ${name}\\([^)]*\\) \\{\\n[\\s\\S]*?\\n  \\}\\n`))[0];
    fns = new Function(`${names.map(grab).join('\n')}\nreturn { ${names.join(', ')} };`)();
  });

  test('elapsed shows position, remaining shows a negative countdown', () => {
    expect(fns.formatTimeReadout(83, 204, 'elapsed')).toBe('1:23');
    expect(fns.formatTimeReadout(83, 204, 'remaining')).toBe('-2:01');
  });

  test('elapsed plus remaining adds up to the total shown', () => {
    // 200.37s track: total reads 3:20, so at 1.2s remaining must be 3:19, not 3:20
    expect(fns.formatTime(200.37)).toBe('3:20');
    expect(fns.formatTimeReadout(1.2, 200.37, 'remaining')).toBe('-3:19');
  });

  test('long tracks show hours in both modes', () => {
    expect(fns.formatTime(3723)).toBe('1:02:03');
    expect(fns.formatTimeReadout(3723, 7200, 'elapsed')).toBe('1:02:03');
    expect(fns.formatTimeReadout(3723, 7200, 'remaining')).toBe('-57:57');
    expect(fns.formatTimeReadout(60, 7200, 'remaining')).toBe('-1:59:00');
    expect(fns.formatTime(59)).toBe('0:59');
    expect(fns.formatTime(600)).toBe('10:00');
  });

  test('remaining never shows -0:00 and never goes below zero', () => {
    expect(fns.formatTimeReadout(204, 204, 'remaining')).toBe('0:00');
    expect(fns.formatTimeReadout(203.9, 204, 'remaining')).toBe('-0:01');
    expect(fns.formatTimeReadout(210, 204, 'remaining')).toBe('0:00');
    expect(fns.formatTimeReadout(NaN, 204, 'remaining')).toBe('-3:24');
  });

  test('with no duration the readout shows elapsed in either mode', () => {
    // A live stream at 1:12 has no end to count down to
    expect(fns.formatTimeReadout(72, 0, 'remaining')).toBe('1:12');
    expect(fns.formatTimeReadout(72, 0, 'elapsed')).toBe('1:12');
    expect(fns.formatTimeReadout(0, 0, 'remaining')).toBe('0:00');
    expect(fns.formatTimeReadout(NaN, undefined, 'remaining')).toBe('0:00');
    expect(fns.formatTimeReadout(72, -1, 'remaining')).toBe('1:12');
  });

  test('an unknown mode falls back to elapsed', () => {
    expect(fns.formatTimeReadout(83, 204, 'bogus')).toBe('1:23');
    expect(fns.formatTimeReadout(83, 204, undefined)).toBe('1:23');
  });

  test('clicking flips between the two modes and back', () => {
    expect(fns.nextTimeMode('elapsed')).toBe('remaining');
    expect(fns.nextTimeMode('remaining')).toBe('elapsed');
    // Anything unexpected lands on a valid mode after one click
    expect(fns.nextTimeMode(undefined)).toBe('remaining');
    expect(fns.nextTimeMode(fns.nextTimeMode('elapsed'))).toBe('elapsed');
  });

  test('a saved mode is restored only if it is a known value', () => {
    expect(fns.parseTimeMode('elapsed')).toBe('elapsed');
    expect(fns.parseTimeMode('remaining')).toBe('remaining');
    expect(fns.parseTimeMode('bogus')).toBeNull();
    expect(fns.parseTimeMode(42)).toBeNull();
    expect(fns.parseTimeMode(undefined)).toBeNull();
  });

  test('playing to stopped parks the ticker and reads 0:00 in remaining mode', () => {
    const seekState = { position: 0, duration: 204, isPlaying: true, lastTrack: 'Song', startPos: 132 };
    // Remaining mode, 72s into a 204s track: counter reads -2:12 while playing
    expect(fns.formatTimeReadout(72, seekState.duration, 'remaining')).toBe('-2:12');

    const pos = fns.parkSeekWithoutDuration(seekState, { state: 'stopped', duration: 0, position: 0 });
    expect(seekState.isPlaying).toBe(false);   // the ticker's own stop condition
    expect(seekState.duration).toBe(0);        // nothing left to count against
    expect(seekState.lastTrack).toBe('');      // next track starts a fresh transition
    expect(pos).toBe(0);
    expect(fns.formatTimeReadout(pos, seekState.duration, 'remaining')).toBe('0:00');
    expect(fns.formatTimeReadout(pos, seekState.duration, 'elapsed')).toBe('0:00');
  });

  test('stopped reads 0:00 even if a stale position comes back', () => {
    const seekState = { position: 90, duration: 204, isPlaying: true, lastTrack: 'Song' };
    expect(fns.parkSeekWithoutDuration(seekState, { state: 'stopped', position: 90 })).toBe(0);
  });

  test('a stream with no duration keeps showing the player position', () => {
    // Already at duration 0, never had a ticker: each poll still reports where the player is
    const seekState = { position: 0, duration: 0, isPlaying: false, lastTrack: '' };
    const pos = fns.parkSeekWithoutDuration(seekState, { state: 'playing', duration: 0, position: 75 });
    expect(pos).toBe(75);
    expect(fns.formatTimeReadout(pos, 0, 'remaining')).toBe('1:15');
    expect(fns.formatTimeReadout(pos, 0, 'elapsed')).toBe('1:15');
    expect(seekState.isPlaying).toBe(false);
  });

  test('skipping from a track to a stream drops the old track duration', () => {
    const seekState = { position: 10, duration: 204, isPlaying: true, lastTrack: 'Song' };
    const pos = fns.parkSeekWithoutDuration(seekState, { state: 'playing', duration: 0, position: 3 });
    expect(seekState.isPlaying).toBe(false);
    expect(seekState.duration).toBe(0);
    expect(fns.formatTimeReadout(pos, seekState.duration, 'remaining')).toBe('0:03');
  });

  test('a missing position parks at zero', () => {
    const seekState = { position: 5, duration: 100, isPlaying: true, lastTrack: 'x' };
    expect(fns.parkSeekWithoutDuration(seekState, { state: 'paused', duration: 0 })).toBe(0);
  });

  test('every position readout goes through renderTime', () => {
    expect((appCode.match(/timeCurrent\.textContent\s*=/g) || []).length).toBe(1);
    expect((appCode.match(/seekTimeLeft\.textContent\s*=/g) || []).length).toBe(1);
  });

  test('the no-duration branch of updateUI stops the ticker and renders once', () => {
    expect(appCode).toMatch(
      /else if \(newState\.duration <= 0\) \{[\s\S]*?parkSeekWithoutDuration\(seek, newState\);\s*stopTimeUpdater\(\);\s*renderTime\(pos, 0\);/
    );
  });

  test('both readouts are wired to the toggle and the choice is saved', () => {
    expect(appCode).toContain("timeDisplay.addEventListener('click', toggleTimeMode)");
    expect(appCode).toContain("seekTimeLeft.addEventListener('click', toggleTimeMode)");
    expect(appCode).toMatch(/function toggleTimeMode\(\)[\s\S]*?nextTimeMode\(state\.timeMode\)[\s\S]*?renderTime\(lastTime\.pos, lastTime\.dur\)[\s\S]*?prefs\.timeMode = state\.timeMode;[\s\S]*?prefs\.save\(prefs\)/);
  });

  test('playlist rows use the same formatter as the counter', () => {
    expect(appCode).toContain('const durStr = formatTime(track.duration);');
    expect(fns.formatTime(3723)).toBe('1:02:03');
  });

  test('both readouts look clickable', () => {
    expect(css).toMatch(/\.time-display\s*\{[^}]*cursor:\s*pointer/);
    expect(css).toMatch(/\.seek-time-left\s*\{[^}]*cursor:\s*pointer/);
    expect(html).toContain('id="time-display"');
    expect(html).toContain('id="seek-time-left"');
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
