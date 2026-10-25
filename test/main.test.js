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
  isFocused: jest.fn(() => true),
  isDestroyed: jest.fn(() => false),
  isMinimized: jest.fn(() => false),
  hide: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  restore: jest.fn(),
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
    removeListener: jest.fn(),
    getPath: jest.fn((name) => `/tmp/argon-test-${name}`),
    quit: jest.fn(),
    focus: jest.fn(),
    dock: { hide: jest.fn(), show: jest.fn() },
  },
  BrowserWindow: Object.assign(jest.fn().mockImplementation(() => mockWindow), {
    getAllWindows: jest.fn(() => [mockWindow]),
  }),
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

describe('Prefs', () => {
  test('hideDockIcon defaults to false and is whitelisted as a boolean', () => {
    const fs = require('fs');
    expect(ipcHandlers['prefs:load']()).toEqual(expect.objectContaining({ hideDockIcon: false }));

    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, { hideDockIcon: true });
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).hideDockIcon).toBe(true);

    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, { hideDockIcon: 'yes' });
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).hideDockIcon).toBe(false);
  });

  test('prefs:save merges into saved prefs instead of clobbering main-process keys', () => {
    const fs = require('fs');
    fs.existsSync.mockImplementation((p) => String(p).endsWith('prefs.json'));
    fs.readFileSync.mockImplementation(() => JSON.stringify({ theme: 'sakura', hideDockIcon: true }));
    fs.writeFileSync.mockClear();
    try {
      // The renderer only sends the keys it knows about
      ipcHandlers['prefs:save']({}, { theme: 'classic-winamp', miniMode: true, unknownKey: 'dropped' });
      const saved = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(saved).toEqual({ theme: 'classic-winamp', miniMode: true, hideDockIcon: true });
    } finally {
      fs.existsSync.mockImplementation(() => false);
      fs.readFileSync.mockImplementation(() => '{}');
    }
  });
});

describe('Dock Icon', () => {
  const lastMenu = () => mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
  const dockItem = () => lastMenu().find((item) => item.label === 'Show Dock Icon');
  const lastSavedPrefs = () => {
    const { calls } = require('fs').writeFileSync.mock;
    return JSON.parse(calls[calls.length - 1][1]);
  };

  test('is not hidden by default', () => {
    const { app } = require('electron');
    expect(app.dock.hide).not.toHaveBeenCalled();
    expect(dockItem()).toEqual(expect.objectContaining({ type: 'checkbox', checked: true }));
  });

  const resignListeners = () => require('electron').app.on.mock.calls.filter((c) => c[0] === 'did-resign-active');

  test('tray menu item hides and shows it live, saves the pref and rebuilds the menu', () => {
    const { app } = require('electron');
    jest.useFakeTimers();
    try {
      ipcHandlers['tray:updateTrack']({}, 'Current Song', 'Current Artist');
      mockWindow.show.mockClear();
      mockWindow.focus.mockClear();

      dockItem().click();
      expect(app.dock.hide).toHaveBeenCalledTimes(1);
      expect(lastSavedPrefs().hideDockIcon).toBe(true);
      expect(dockItem().checked).toBe(false);
      expect(lastMenu()[0].label).toBe('Current Song');

      // Becoming an accessory app deactivates Argon (possibly more than once); focus comes back once, after that
      const onResignActive = resignListeners().pop()[1];
      onResignActive();
      onResignActive();
      jest.advanceTimersByTime(100);
      expect(mockWindow.show).toHaveBeenCalledTimes(1);
      expect(mockWindow.focus).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);
      expect(app.removeListener).toHaveBeenCalledWith('did-resign-active', onResignActive);

      dockItem().click();
      expect(app.dock.show).toHaveBeenCalledTimes(1);
      expect(lastSavedPrefs().hideDockIcon).toBe(false);
      expect(dockItem().checked).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('hiding it does not pull focus to a window that did not have it', () => {
    const before = resignListeners().length;
    mockWindow.isFocused.mockReturnValueOnce(false);
    dockItem().click();
    expect(resignListeners().length).toBe(before);
    dockItem().click(); // back to visible for the tests below
  });
});

describe('Tray — closed window', () => {
  // window:close destroys the window; Electron then throws on any method call
  const destroyWindow = () => {
    mockWindow.isDestroyed.mockReturnValue(true);
    mockWindow.isVisible.mockImplementation(() => { throw new TypeError('Object has been destroyed'); });
  };

  afterEach(() => {
    const { BrowserWindow } = require('electron');
    mockWindow.isDestroyed.mockReturnValue(false);
    mockWindow.isVisible.mockImplementation(() => true);
    BrowserWindow.getAllWindows.mockReturnValue([mockWindow]);
  });

  test('tray click recreates a destroyed window', () => {
    const { BrowserWindow } = require('electron');
    destroyWindow();
    const created = BrowserWindow.mock.calls.length;
    const onClick = mockTray.on.mock.calls.find((c) => c[0] === 'click')[1];
    expect(() => onClick()).not.toThrow();
    expect(BrowserWindow.mock.calls.length).toBe(created + 1);
  });

  test('Show Window recreates a destroyed window', () => {
    const { BrowserWindow } = require('electron');
    destroyWindow();
    expect(() => ipcHandlers['tray:updateTrack']({}, 'Song', 'Artist')).not.toThrow();
    const menu = mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
    const item = menu.find((i) => i.label === 'Show Window');
    expect(item).toBeDefined();
    const created = BrowserWindow.mock.calls.length;
    expect(() => item.click()).not.toThrow();
    expect(BrowserWindow.mock.calls.length).toBe(created + 1);
  });

  test('activate recreates the window once it has been closed', () => {
    const { app, BrowserWindow } = require('electron');
    destroyWindow();
    BrowserWindow.getAllWindows.mockReturnValue([]);
    const created = BrowserWindow.mock.calls.length;
    app.on.mock.calls.find((c) => c[0] === 'activate')[1]();
    expect(BrowserWindow.mock.calls.length).toBe(created + 1);
  });

  test('Cmd+Shift+M recreates a destroyed window instead of throwing', () => {
    const { BrowserWindow } = require('electron');
    destroyWindow();
    mockWindow.webContents.send.mockImplementation(() => { throw new TypeError('Object has been destroyed'); });
    try {
      const created = BrowserWindow.mock.calls.length;
      expect(() => registeredShortcuts['CommandOrControl+Shift+M']()).not.toThrow();
      expect(BrowserWindow.mock.calls.length).toBe(created + 1);
    } finally {
      mockWindow.webContents.send.mockImplementation(() => undefined);
    }
  });

  test('the tray menu offers Show Window once the window is closed', () => {
    destroyWindow();
    const onClosed = mockWindow.on.mock.calls.filter((c) => c[0] === 'closed').pop()[1];
    onClosed();
    const menu = mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
    expect(menu.find((i) => i.label === 'Show Window')).toBeDefined();
  });

  test('the Show/Hide Window label follows the window being hidden and shown', () => {
    const handler = (evt) => mockWindow.on.mock.calls.filter((c) => c[0] === evt).pop()[1];
    const lastMenu = () => mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
    mockWindow.isVisible.mockReturnValue(false);
    handler('hide')();
    expect(lastMenu().find((i) => i.label === 'Show Window')).toBeDefined();
    mockWindow.isVisible.mockReturnValue(true);
    handler('show')();
    expect(lastMenu().find((i) => i.label === 'Hide Window')).toBeDefined();
  });
});

describe('Tray — window behind other windows', () => {
  const lastMenu = () => mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
  const windowItem = () => lastMenu().find((i) => i.label === 'Show Window' || i.label === 'Hide Window');
  const handler = (evt) => mockWindow.on.mock.calls.filter((c) => c[0] === evt).pop()[1];
  const trayClick = () => mockTray.on.mock.calls.find((c) => c[0] === 'click')[1]();
  // Still visible, but another app's windows are in front of it
  const buryWindow = () => {
    mockWindow.isFocused.mockReturnValue(false);
    handler('blur')();
  };

  beforeEach(() => {
    require('electron').app.focus.mockClear();
    [mockWindow.show, mockWindow.focus, mockWindow.hide, mockWindow.restore].forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    mockWindow.isFocused.mockReturnValue(true);
    mockWindow.isAlwaysOnTop.mockReturnValue(false);
    mockWindow.isMinimized.mockReturnValue(false);
    mockWindow.isVisible.mockImplementation(() => true);
    mockWindow.setAlwaysOnTop.mockImplementation(() => undefined);
  });

  test('the menu offers Show Window once the window loses focus, and Hide Window when it gets it back', () => {
    buryWindow();
    expect(windowItem().label).toBe('Show Window');
    mockWindow.isFocused.mockReturnValue(true);
    handler('focus')();
    expect(windowItem().label).toBe('Hide Window');
  });

  test('Show Window brings a buried window to the front instead of hiding it', () => {
    const { app } = require('electron');
    buryWindow();
    windowItem().click();
    expect(app.focus).toHaveBeenCalledWith({ steal: true });
    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.focus).toHaveBeenCalled();
    expect(mockWindow.hide).not.toHaveBeenCalled();
  });

  test('tray click brings a buried window forward, and hides it only when it is in front', () => {
    buryWindow();
    trayClick();
    expect(mockWindow.focus).toHaveBeenCalled();
    expect(mockWindow.hide).not.toHaveBeenCalled();
    mockWindow.isFocused.mockReturnValue(true);
    trayClick();
    expect(mockWindow.hide).toHaveBeenCalledTimes(1);
  });

  test('Show Window restores a minimized window', () => {
    mockWindow.isMinimized.mockReturnValue(true);
    mockWindow.isVisible.mockImplementation(() => false);
    handler('minimize')();
    windowItem().click();
    expect(mockWindow.restore).toHaveBeenCalled();
    expect(mockWindow.show).toHaveBeenCalled();
  });

  test('a window pinned always on top counts as in front, and pinning updates the menu', () => {
    mockWindow.setAlwaysOnTop.mockImplementation((onTop) => mockWindow.isAlwaysOnTop.mockReturnValue(onTop));
    buryWindow();
    expect(windowItem().label).toBe('Show Window');
    ipcHandlers['window:toggleOnTop']();
    expect(windowItem().label).toBe('Hide Window');
  });
});

describe('Dock Icon — pref on at startup', () => {
  test('hides the Dock icon before the window is created', async () => {
    const fs = require('fs');
    const { app, BrowserWindow } = require('electron');
    // Loads a second copy of main.js with hideDockIcon saved. The electron/fs mocks are shared
    // with the first copy, so restore its handlers and the fs mocks afterwards.
    const savedHandlers = { ...ipcHandlers };
    const savedShortcuts = { ...registeredShortcuts };
    app.dock.hide.mockClear();
    BrowserWindow.mockClear();
    fs.existsSync.mockImplementation((p) => String(p).endsWith('prefs.json'));
    fs.readFileSync.mockImplementation(() => JSON.stringify({ hideDockIcon: true }));
    try {
      jest.isolateModules(() => require('../main.js'));
      await new Promise(setImmediate); // let app.whenReady().then(...) run

      expect(app.dock.hide).toHaveBeenCalledTimes(1);
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
      expect(app.dock.hide.mock.invocationCallOrder[0]).toBeLessThan(BrowserWindow.mock.invocationCallOrder[0]);
      const menu = mockTray.setContextMenu.mock.calls[mockTray.setContextMenu.mock.calls.length - 1][0];
      expect(menu.find((i) => i.label === 'Show Dock Icon').checked).toBe(false);
    } finally {
      fs.existsSync.mockImplementation(() => false);
      fs.readFileSync.mockImplementation(() => '{}');
      Object.assign(ipcHandlers, savedHandlers);
      Object.assign(registeredShortcuts, savedShortcuts);
    }
  });
});
