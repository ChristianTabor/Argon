/**
 * Tests for preload.js — Context bridge API surface
 * Verifies all API methods are exposed correctly
 */

const exposedApis = {};

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn((name, api) => {
      exposedApis[name] = api;
    }),
  },
  ipcRenderer: {
    invoke: jest.fn((channel, ...args) => Promise.resolve(`mock:${channel}`)),
    on: jest.fn((channel, cb) => cb),
  },
}));

beforeAll(() => {
  require('../preload.js');
});

describe('API Bridge Structure', () => {
  test('exposes api to main world', () => {
    const { contextBridge } = require('electron');
    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object));
  });

  test('api object exists', () => {
    expect(exposedApis.api).toBeDefined();
  });
});

describe('Music API', () => {
  const musicMethods = [
    'getState', 'getArtwork', 'play', 'pause', 'playpause',
    'next', 'prev', 'setVolume', 'setPosition',
    'toggleShuffle', 'toggleRepeat', 'getPlaylist', 'playTrackIndex',
    'getLyrics',
  ];

  test.each(musicMethods)('exposes music.%s', (method) => {
    expect(typeof exposedApis.api.music[method]).toBe('function');
  });

  test('getLyrics calls correct IPC channel', async () => {
    const { ipcRenderer } = require('electron');
    await exposedApis.api.music.getLyrics();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('music:getLyrics');
  });

  test('setVolume passes volume parameter', async () => {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke.mockClear();
    await exposedApis.api.music.setVolume(75);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('music:setVolume', 75);
  });

  test('playTrackIndex passes index parameter', async () => {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke.mockClear();
    await exposedApis.api.music.playTrackIndex(5);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('music:playTrackIndex', 5);
  });
});

describe('Notifications API', () => {
  test('exposes notifications.trackChange', () => {
    expect(typeof exposedApis.api.notifications.trackChange).toBe('function');
  });

  test('trackChange passes track, artist, album', async () => {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke.mockClear();
    await exposedApis.api.notifications.trackChange('Song', 'Artist', 'Album');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('notify:trackChange', 'Song', 'Artist', 'Album');
  });
});

describe('Tray API', () => {
  test('exposes tray.updateTrack', () => {
    expect(typeof exposedApis.api.tray.updateTrack).toBe('function');
  });

  test('updateTrack passes track and artist', async () => {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke.mockClear();
    await exposedApis.api.tray.updateTrack('Song', 'Artist');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('tray:updateTrack', 'Song', 'Artist');
  });
});

describe('Themes API', () => {
  const themeMethods = ['list', 'load', 'install', 'openFolder'];

  test.each(themeMethods)('exposes themes.%s', (method) => {
    expect(typeof exposedApis.api.themes[method]).toBe('function');
  });
});

describe('Window API', () => {
  const windowMethods = [
    'minimize', 'close', 'toggleOnTop', 'snapBottomRight',
    'setMinMaxSize', 'resize', 'applyConstraints', 'toggleLock', 'setVibrancy',
  ];

  test.each(windowMethods)('exposes window.%s', (method) => {
    expect(typeof exposedApis.api.window[method]).toBe('function');
  });
});

describe('Preferences API', () => {
  test('exposes prefs.load', () => {
    expect(typeof exposedApis.api.prefs.load).toBe('function');
  });

  test('exposes prefs.save', () => {
    expect(typeof exposedApis.api.prefs.save).toBe('function');
  });
});

describe('IPC Event Listeners', () => {
  test('exposes onToggleMiniMode', () => {
    expect(typeof exposedApis.api.onToggleMiniMode).toBe('function');
  });

  test('onToggleMiniMode registers IPC listener', () => {
    const { ipcRenderer } = require('electron');
    const callback = jest.fn();
    exposedApis.api.onToggleMiniMode(callback);
    expect(ipcRenderer.on).toHaveBeenCalledWith('toggle-mini-mode', expect.any(Function));
  });
});
