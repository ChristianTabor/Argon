/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const { installCanvasStub } = require('./helpers/canvas');

function stoppedState() {
  return {
    state: 'stopped',
    track: '',
    artist: '',
    album: '',
    duration: 0,
    position: 0,
    volume: 50,
    shuffle: false,
    repeat: 'off',
  };
}

function playingState(overrides) {
  return {
    ...stoppedState(),
    state: 'playing',
    track: 'Song A',
    artist: 'Artist A',
    album: 'Album A',
    duration: 200,
    position: 10,
    volume: 40,
    ...overrides,
  };
}

async function settle() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

describe('renderer behavior', () => {
  let api;
  let poll;
  let toggleMini;
  let frames;

  // Run the animation frames queued so far (new ones wait for the next call)
  function flushFrames() {
    const queued = frames;
    frames = [];
    for (const fn of queued) fn();
  }

  beforeAll(async () => {
    const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    document.open();
    document.write(html);
    document.close();

    installCanvasStub();
    window.devicePixelRatio = 1;
    frames = [];
    window.requestAnimationFrame = (fn) => frames.push(fn);
    window.cancelAnimationFrame = () => {};
    window.HTMLElement.prototype.scrollIntoView = () => {};
    poll = null;
    window.setInterval = (fn, ms) => {
      if (ms === 500) poll = fn;
      return 1;
    };
    window.setTimeout = () => 2;

    api = {
      music: {
        getState: jest.fn(async () => stoppedState()),
        getArtwork: jest.fn(async () => null),
        getPlaylist: jest.fn(async () => null),
        getLyrics: jest.fn(async () => 'First line\nSecond line'),
        play: jest.fn(async () => {}),
        pause: jest.fn(async () => {}),
        playpause: jest.fn(async () => {}),
        next: jest.fn(async () => {}),
        prev: jest.fn(async () => {}),
        setVolume: jest.fn(async () => {}),
        setPosition: jest.fn(async () => {}),
        toggleShuffle: jest.fn(async () => {}),
        toggleRepeat: jest.fn(async () => {}),
        playTrackIndex: jest.fn(async () => {}),
        toggleFavorite: jest.fn(async () => true),
      },
      notifications: { trackChange: jest.fn(async () => {}) },
      tray: { updateTrack: jest.fn(async () => {}) },
      themes: {
        list: jest.fn(async () => []),
        load: jest.fn(async () => null),
        install: jest.fn(async () => null),
        openFolder: jest.fn(async () => {}),
      },
      window: {
        minimize: jest.fn(),
        close: jest.fn(),
        toggleOnTop: jest.fn(async () => true),
        snapBottomRight: jest.fn(),
        setMinMaxSize: jest.fn(),
        resize: jest.fn(),
        applyConstraints: jest.fn(),
        toggleLock: jest.fn(async () => false),
        setVibrancy: jest.fn(),
      },
      prefs: {
        load: jest.fn(async () => ({})),
        save: jest.fn(async () => {}),
      },
      onToggleMiniMode: jest.fn((cb) => { toggleMini = cb; }),
    };
    window.api = api;

    // Same order as index.html. In the page favorite.js and playlist-layout.js define globals;
    // under require() they export instead, so put those exports on window before app.js runs.
    require('../src/js/visualizer.js');
    require('../src/js/theme-manager.js');
    window.createFavoriteController = require('../src/js/favorite.js').createFavoriteController;
    window.isFavoriteKey = require('../src/js/favorite.js').isFavoriteKey;
    window.PlaylistLayout = require('../src/js/playlist-layout.js');
    require('../src/js/app.js');
    await settle();
  });

  function key(code, target) {
    const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
    (target || document).dispatchEvent(event);
  }

  test('Space starts playback while stopped', async () => {
    api.music.getState.mockResolvedValue(stoppedState());
    await poll();
    api.music.play.mockClear();
    key('Space');
    expect(api.music.play).toHaveBeenCalledTimes(1);
  });

  test('a polled track updates the display, notifies once, and formats the duration', async () => {
    api.notifications.trackChange.mockClear();
    api.tray.updateTrack.mockClear();
    api.music.getState.mockResolvedValue(playingState());
    await poll();
    await settle();

    expect(document.getElementById('track-name-display').textContent).toBe('Song A');
    expect(document.getElementById('track-artist-display').textContent).toBe('Artist A');
    expect(document.getElementById('album-display').textContent).toBe('Album A');
    expect(document.getElementById('time-total').textContent).toBe('3:20');
    expect(api.notifications.trackChange).toHaveBeenCalledTimes(1);
    expect(api.notifications.trackChange).toHaveBeenCalledWith('Song A', 'Artist A', 'Album A');
    expect(api.tray.updateTrack).toHaveBeenCalledWith('Song A', 'Artist A');

    await poll();
    expect(api.notifications.trackChange).toHaveBeenCalledTimes(1);
  });

  test('opening lyrics shows the fetched lyrics and closes the equalizer', async () => {
    document.getElementById('btn-eq').click();
    expect(document.getElementById('eq-panel').classList.contains('open')).toBe(true);

    api.music.getLyrics.mockClear();
    document.getElementById('btn-lyrics').click();
    await settle();

    expect(document.getElementById('lyrics-panel').classList.contains('open')).toBe(true);
    expect(document.getElementById('eq-panel').classList.contains('open')).toBe(false);
    expect(api.music.getLyrics).toHaveBeenCalledTimes(1);
    expect(document.getElementById('lyrics-content').textContent).toBe('First line\nSecond line');
  });

  test('choosing a preset moves the sliders and saves those bands', async () => {
    const select = document.getElementById('eq-preset-select');
    select.value = 'rock';
    select.dispatchEvent(new Event('change'));
    await settle();

    const values = [...document.querySelectorAll('#eq-sliders input')].map((input) => Number(input.value));
    expect(values).toEqual([5, 4, 3, 1, -1, -1, 2, 3, 4, 5]);
    expect(api.prefs.save).toHaveBeenCalledWith(expect.objectContaining({
      eqBands: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
      eqPreset: 'rock',
    }));
  });

  test('the E key opens the equalizer and closes lyrics', () => {
    key('KeyE');
    expect(document.getElementById('eq-panel').classList.contains('open')).toBe(true);
    expect(document.getElementById('lyrics-panel').classList.contains('open')).toBe(false);
  });

  test('shortcuts do nothing while a select is focused', () => {
    const lyricsOpen = document.getElementById('lyrics-panel').classList.contains('open');
    key('KeyL', document.getElementById('eq-preset-select'));
    expect(document.getElementById('lyrics-panel').classList.contains('open')).toBe(lyricsOpen);
  });

  test('windowshade applies the mini strip constraints and saves the pref', async () => {
    api.window.applyConstraints.mockClear();
    api.prefs.save.mockClear();
    document.getElementById('btn-mini').click();
    await settle();

    expect(document.getElementById('player').classList.contains('mini-mode')).toBe(true);
    expect(api.window.applyConstraints).toHaveBeenCalledWith(280, 28, 600, 28, 320, 28);
    expect(document.getElementById('mini-track').textContent).toBe('Song A — Artist A');
    expect(api.prefs.save).toHaveBeenCalledWith(expect.objectContaining({ miniMode: true }));
  });

  test('the mini-mode shortcut from the main process toggles windowshade off', async () => {
    toggleMini();
    await settle();
    expect(document.getElementById('player').classList.contains('mini-mode')).toBe(false);
  });

  test('the visualizer overlay asks the visualizer for the next mode', () => {
    const spy = jest.spyOn(window.Visualizer.prototype, 'nextMode');
    document.getElementById('viz-mode-toggle').click();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('index.html loads favorite.js and playlist-layout.js before app.js', () => {
    const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
    const order = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);
    expect(order.indexOf('favorite.js')).toBeGreaterThan(-1);
    expect(order.indexOf('playlist-layout.js')).toBeGreaterThan(-1);
    expect(order.indexOf('favorite.js')).toBeLessThan(order.indexOf('app.js'));
    expect(order.indexOf('playlist-layout.js')).toBeLessThan(order.indexOf('app.js'));
  });

  test('a themechange resizes the window from the new theme CSS', () => {
    document.getElementById('theme-styles').textContent =
      ':root { --base-width: 320; --window-min-width: 280; --window-min-height: 400; --window-max-width: 900; --window-max-height: 1000; }';
    api.window.applyConstraints.mockClear();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId: 'wide', meta: { name: 'Wide' }, adaptive: false } }));
    expect(api.window.applyConstraints).not.toHaveBeenCalled(); // waits a frame for the CSS to apply
    flushFrames();
    expect(api.window.applyConstraints).toHaveBeenCalledWith(280, 400, 900, 1000, 320, 400);
  });
});
