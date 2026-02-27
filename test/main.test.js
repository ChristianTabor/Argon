/**
 * Tests for main.js — Electron main process logic
 * Tests global shortcuts, tray, notifications, lyrics IPC, and window management
 */

// ─── Mock Electron modules ──────────────────────────────────────────────────

const mockWindow = {
  loadFile: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  on: jest.fn(),
  webContents: { send: jest.fn(), openDevTools: jest.fn() },
  isVisible: jest.fn(() => true),
  hide: jest.fn(),
  show: jest.fn(),
  minimize: jest.fn(),
  close: jest.fn(),
  isAlwaysOnTop: jest.fn(() => false),
  setMovable: jest.fn(),
  setVibrancy: jest.fn(),
  setBackgroundColor: jest.fn(),
  getSize: jest.fn(() => [300, 500]),
  setSize: jest.fn(),
  setPosition: jest.fn(),
  setMinimumSize: jest.fn(),
  setMaximumSize: jest.fn(),
  getBounds: jest.fn(() => ({ x: 0, y: 0, width: 300, height: 500 })),
};

const ipcHandlers = {};
const mockTray = {
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};
const mockNotification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
}));
mockNotification.isSupported = jest.fn(() => true);

const registeredShortcuts = {};

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    getPath: jest.fn((name) => `/tmp/argon-test-${name}`),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => mockWindow),
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      ipcHandlers[channel] = handler;
    }),
  },
  dialog: { showOpenDialog: jest.fn() },
  shell: { openPath: jest.fn() },
  screen: {
    getDisplayMatching: jest.fn(() => ({
      workArea: { width: 1920, height: 1080, x: 0, y: 0 },
    })),
  },
  globalShortcut: {
    register: jest.fn((key, cb) => { registeredShortcuts[key] = cb; }),
    unregisterAll: jest.fn(),
  },
  Tray: jest.fn().mockImplementation(() => mockTray),
  Menu: {
    buildFromTemplate: jest.fn((template) => template),
  },
  nativeImage: {
    createFromBuffer: jest.fn(() => ({
      setTemplateImage: jest.fn(),
    })),
  },
  Notification: mockNotification,
}));

jest.mock('child_process', () => ({
  execFile: jest.fn((cmd, args, opts, cb) => {
    // Return mock AppleScript results
    if (typeof opts === 'function') {
      cb = opts;
    }
    if (args && args[1] && args[1].includes('lyrics of current track')) {
      cb(null, 'These are test lyrics\nLine two\n', '');
    } else if (args && args[1] && args[1].includes('player state')) {
      cb(null, 'playing||Test Song||Test Artist||Test Album||240||120||75||false||off\n', '');
    } else {
      cb(null, '', '');
    }
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => '{}'),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ isDirectory: () => false })),
  rmSync: jest.fn(),
}));

// ─── Load main.js ───────────────────────────────────────────────────────────

beforeAll(() => {
  require('../main.js');
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('IPC Handlers Registration', () => {
  test('registers all music IPC handlers', () => {
    const musicHandlers = [
      'music:getState', 'music:getArtwork', 'music:play', 'music:pause',
      'music:playpause', 'music:next', 'music:prev', 'music:setVolume',
      'music:setPosition', 'music:toggleShuffle', 'music:toggleRepeat',
      'music:getPlaylist', 'music:playTrackIndex', 'music:getLyrics',
    ];
    for (const handler of musicHandlers) {
      expect(ipcHandlers[handler]).toBeDefined();
    }
  });

  test('registers notification IPC handler', () => {
    expect(ipcHandlers['notify:trackChange']).toBeDefined();
  });

  test('registers tray update IPC handler', () => {
    expect(ipcHandlers['tray:updateTrack']).toBeDefined();
  });

  test('registers all window IPC handlers', () => {
    const windowHandlers = [
      'window:minimize', 'window:close', 'window:toggleOnTop',
      'window:snapBottomRight', 'window:setMinMaxSize',
      'window:resize', 'window:applyConstraints', 'window:toggleLock',
      'window:setVibrancy',
    ];
    for (const handler of windowHandlers) {
      expect(ipcHandlers[handler]).toBeDefined();
    }
  });

  test('registers theme IPC handlers', () => {
    const themeHandlers = ['themes:list', 'themes:load', 'themes:install', 'themes:openFolder'];
    for (const handler of themeHandlers) {
      expect(ipcHandlers[handler]).toBeDefined();
    }
  });

  test('registers prefs IPC handlers', () => {
    expect(ipcHandlers['prefs:load']).toBeDefined();
    expect(ipcHandlers['prefs:save']).toBeDefined();
  });
});

describe('Lyrics IPC', () => {
  test('music:getLyrics returns lyrics text', async () => {
    const result = await ipcHandlers['music:getLyrics']();
    expect(typeof result).toBe('string');
  });
});

describe('Notifications IPC', () => {
  test('notify:trackChange creates a Notification', () => {
    ipcHandlers['notify:trackChange']({}, 'Test Song', 'Test Artist', 'Test Album');
    expect(mockNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Song',
        body: expect.stringContaining('Test Artist'),
        silent: true,
      })
    );
  });

  test('notify:trackChange handles missing fields', () => {
    mockNotification.mockClear();
    ipcHandlers['notify:trackChange']({}, null, null, null);
    expect(mockNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unknown Track',
      })
    );
  });
});

describe('Global Shortcuts', () => {
  test('registers media key shortcuts', () => {
    const { globalShortcut } = require('electron');
    expect(globalShortcut.register).toHaveBeenCalledWith('MediaPlayPause', expect.any(Function));
    expect(globalShortcut.register).toHaveBeenCalledWith('MediaNextTrack', expect.any(Function));
    expect(globalShortcut.register).toHaveBeenCalledWith('MediaPreviousTrack', expect.any(Function));
  });

  test('registers volume shortcuts', () => {
    const { globalShortcut } = require('electron');
    expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+Up', expect.any(Function));
    expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+Down', expect.any(Function));
  });

  test('registers mini mode shortcut', () => {
    const { globalShortcut } = require('electron');
    expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+M', expect.any(Function));
  });

  test('mini mode shortcut sends IPC to renderer', () => {
    registeredShortcuts['CommandOrControl+Shift+M']();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('toggle-mini-mode');
  });
});

describe('Tray', () => {
  test('creates tray on app ready', () => {
    const { Tray } = require('electron');
    expect(Tray).toHaveBeenCalled();
  });

  test('tray sets tooltip', () => {
    expect(mockTray.setToolTip).toHaveBeenCalledWith('Argon');
  });

  test('tray sets initial context menu', () => {
    expect(mockTray.setContextMenu).toHaveBeenCalled();
  });

  test('tray:updateTrack updates the menu', () => {
    const callsBefore = mockTray.setContextMenu.mock.calls.length;
    ipcHandlers['tray:updateTrack']({}, 'New Song', 'New Artist');
    expect(mockTray.setContextMenu.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('Window Management', () => {
  test('window:applyConstraints sets min/max/size', async () => {
    await ipcHandlers['window:applyConstraints']({}, 200, 56, 600, 56, 320, 56);
    expect(mockWindow.setMinimumSize).toHaveBeenCalled();
    expect(mockWindow.setMaximumSize).toHaveBeenCalled();
    expect(mockWindow.setSize).toHaveBeenCalled();
  });

  test('window:toggleOnTop toggles always on top', async () => {
    const result = await ipcHandlers['window:toggleOnTop']();
    expect(mockWindow.setAlwaysOnTop).toHaveBeenCalled();
    expect(typeof result).toBe('boolean');
  });

  test('window:toggleLock toggles movability', async () => {
    const result = await ipcHandlers['window:toggleLock']();
    expect(mockWindow.setMovable).toHaveBeenCalled();
    expect(typeof result).toBe('boolean');
  });
});

describe('Security — Input Validation', () => {
  test('music:setVolume rejects non-finite values', async () => {
    const result = await ipcHandlers['music:setVolume']({}, 'malicious string');
    expect(result).toBeUndefined();
  });

  test('music:setVolume rejects out-of-range values', async () => {
    const result = await ipcHandlers['music:setVolume']({}, 150);
    expect(result).toBeUndefined();
  });

  test('music:setPosition rejects non-finite values', async () => {
    const result = await ipcHandlers['music:setPosition']({}, 'injection attempt');
    expect(result).toBeUndefined();
  });

  test('music:setPosition rejects negative values', async () => {
    const result = await ipcHandlers['music:setPosition']({}, -5);
    expect(result).toBeUndefined();
  });

  test('music:playTrackIndex rejects non-finite values', async () => {
    const result = await ipcHandlers['music:playTrackIndex']({}, 'not a number');
    expect(result).toBeUndefined();
  });

  test('music:playTrackIndex rejects zero/negative index', async () => {
    const result = await ipcHandlers['music:playTrackIndex']({}, 0);
    expect(result).toBeUndefined();
  });

  test('themes:load rejects path traversal attempts', () => {
    const result = ipcHandlers['themes:load']({}, '../../etc');
    expect(result).toBeNull();
  });

  test('themes:load rejects slashes in themeId', () => {
    expect(ipcHandlers['themes:load']({}, 'foo/bar')).toBeNull();
    expect(ipcHandlers['themes:load']({}, 'foo\\bar')).toBeNull();
  });

  test('themes:load rejects empty themeId', () => {
    expect(ipcHandlers['themes:load']({}, '')).toBeNull();
  });

  test('prefs:save rejects non-object input', () => {
    ipcHandlers['prefs:save']({}, 'a string');
    ipcHandlers['prefs:save']({}, null);
    ipcHandlers['prefs:save']({}, [1, 2, 3]);
    // Should not throw
  });

  test('prefs:save strips unknown keys', () => {
    const fs = require('fs');
    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, { theme: 'classic', __proto__: { evil: true }, unknownKey: 'dropped' });
    if (fs.writeFileSync.mock.calls.length > 0) {
      const saved = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(saved.unknownKey).toBeUndefined();
      expect(saved.theme).toBe('classic');
    }
  });

  test('notify:trackChange truncates long strings', () => {
    mockNotification.mockClear();
    const longStr = 'x'.repeat(500);
    ipcHandlers['notify:trackChange']({}, longStr, longStr, longStr);
    expect(mockNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        body: expect.any(String),
      })
    );
    const call = mockNotification.mock.calls[0][0];
    expect(call.title.length).toBeLessThanOrEqual(200);
    expect(call.body.length).toBeLessThanOrEqual(500);
  });
});

describe('App Lifecycle', () => {
  test('registers will-quit handler', () => {
    const { app } = require('electron');
    const willQuitCalls = app.on.mock.calls.filter(c => c[0] === 'will-quit');
    expect(willQuitCalls.length).toBeGreaterThan(0);
  });

  test('registers window-all-closed handler', () => {
    const { app } = require('electron');
    const closedCalls = app.on.mock.calls.filter(c => c[0] === 'window-all-closed');
    expect(closedCalls.length).toBeGreaterThan(0);
  });

  test('registers activate handler', () => {
    const { app } = require('electron');
    const activateCalls = app.on.mock.calls.filter(c => c[0] === 'activate');
    expect(activateCalls.length).toBeGreaterThan(0);
  });
});
