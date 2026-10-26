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
  popUpContextMenu: jest.fn(),
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

const scripts = require('../lib/apple-music');
const { execFile } = require('child_process');
const { app } = require('electron');

beforeAll(() => {
  require('../main.js');
});

// The tray menu main.js built most recently
const lastTrayMenu = () => require('electron').Menu.buildFromTemplate.mock.results.at(-1).value;

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

  test('tray builds its menu but does not attach it to clicks', () => {
    // Attached with setContextMenu, macOS would open the menu on every click
    expect(require('electron').Menu.buildFromTemplate).toHaveBeenCalled();
    expect(mockTray.setContextMenu).not.toHaveBeenCalled();
  });

  test('tray:updateTrack updates the menu', () => {
    const { Menu } = require('electron');
    const callsBefore = Menu.buildFromTemplate.mock.calls.length;
    ipcHandlers['tray:updateTrack']({}, 'New Song', 'New Artist');
    expect(Menu.buildFromTemplate.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(lastTrayMenu()[0].label).toBe('New Song');
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
    expect(fs.writeFileSync).toHaveBeenCalled();
    const saved = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(saved.unknownKey).toBeUndefined();
    expect(saved.evil).toBeUndefined();
    expect(saved.theme).toBe('classic');
    expect(Object.keys(saved)).not.toContain('__proto__');

    const polluted = JSON.parse('{"theme":"sakura","__proto__":{"evil":true},"unknownKey":"dropped","transparency":"nope"}');
    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, polluted);
    expect(fs.writeFileSync).toHaveBeenCalled();
    const parsed = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(parsed.theme).toBe('sakura');
    expect(parsed.unknownKey).toBeUndefined();
    expect(parsed.evil).toBeUndefined();
    expect(parsed.transparency).toBeUndefined();
    expect(Object.keys(parsed)).not.toContain('__proto__');
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
  const lastMenu = () => lastTrayMenu();
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
    const menu = lastTrayMenu();
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
    const menu = lastTrayMenu();
    expect(menu.find((i) => i.label === 'Show Window')).toBeDefined();
  });

  test('the Show/Hide Window label follows the window being hidden and shown', () => {
    const handler = (evt) => mockWindow.on.mock.calls.filter((c) => c[0] === evt).pop()[1];
    const lastMenu = () => lastTrayMenu();
    mockWindow.isVisible.mockReturnValue(false);
    handler('hide')();
    expect(lastMenu().find((i) => i.label === 'Show Window')).toBeDefined();
    mockWindow.isVisible.mockReturnValue(true);
    handler('show')();
    expect(lastMenu().find((i) => i.label === 'Hide Window')).toBeDefined();
  });
});

describe('Tray — window behind other windows', () => {
  const lastMenu = () => lastTrayMenu();
  const windowItem = () => lastMenu().find((i) => i.label === 'Show Window' || i.label === 'Hide Window');
  const handler = (evt) => mockWindow.on.mock.calls.filter((c) => c[0] === evt).pop()[1];
  const trayClick = (event = {}) => mockTray.on.mock.calls.find((c) => c[0] === 'click')[1](event);
  const trayRightClick = () => mockTray.on.mock.calls.find((c) => c[0] === 'right-click')[1]();
  // Still visible, but another app's windows are in front of it
  const buryWindow = () => {
    mockWindow.isFocused.mockReturnValue(false);
    handler('blur')();
  };

  beforeEach(() => {
    require('electron').app.focus.mockClear();
    mockTray.popUpContextMenu.mockClear();
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

  test('clicking the icon brings the window up and always opens the menu', () => {
    buryWindow();
    trayClick();
    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.focus).toHaveBeenCalled();
    expect(mockTray.popUpContextMenu).toHaveBeenLastCalledWith(lastTrayMenu());
    // Labeled for the window it just brought up, though the mock still reports no focus
    expect(windowItem().label).toBe('Hide Window');
    mockWindow.isFocused.mockReturnValue(true);
    handler('focus')();
    trayClick();
    expect(mockTray.popUpContextMenu).toHaveBeenCalledTimes(2);
    expect(mockWindow.hide).not.toHaveBeenCalled();
  });

  test('right-click and Control-click open the menu without moving the window', () => {
    buryWindow();
    trayRightClick();
    trayClick({ ctrlKey: true });
    expect(mockTray.popUpContextMenu).toHaveBeenCalledTimes(2);
    expect(mockTray.popUpContextMenu).toHaveBeenLastCalledWith(lastTrayMenu());
    expect(mockWindow.show).not.toHaveBeenCalled();
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
      const menu = lastTrayMenu();
      expect(menu.find((i) => i.label === 'Show Dock Icon').checked).toBe(false);
    } finally {
      fs.existsSync.mockImplementation(() => false);
      fs.readFileSync.mockImplementation(() => '{}');
      Object.assign(ipcHandlers, savedHandlers);
      Object.assign(registeredShortcuts, savedShortcuts);
    }
  });
});

describe('AppleScript IPC', () => {
  test('music:setVolume asks osascript for the builder script and skips rejected input', async () => {
    execFile.mockClear();
    await ipcHandlers['music:setVolume']({}, 40);
    expect(execFile).toHaveBeenCalledWith(
      'osascript',
      ['-e', scripts.setVolume(40)],
      expect.any(Object),
      expect.any(Function)
    );
    execFile.mockClear();
    expect(await ipcHandlers['music:setVolume']({}, '40')).toBeUndefined();
    expect(await ipcHandlers['music:setVolume']({}, NaN)).toBeUndefined();
    expect(execFile).not.toHaveBeenCalled();
  });

  test('music:getState keeps || inside a track name', async () => {
    const payload = ['playing', 'A || B', 'Artist', 'Album', '240', '12', '75', 'false', 'off'].join(scripts.FIELD);
    execFile.mockImplementationOnce((cmd, args, opts, cb) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, `${payload}\n`, '');
    });
    const state = await ipcHandlers['music:getState']();
    expect(state.track).toBe('A || B');
    expect(state.artist).toBe('Artist');
    expect(state.duration).toBe(240);
    expect(execFile.mock.calls.at(-1)[1][1]).toBe(scripts.playerState());
  });

  test('music:getPlaylist keeps tabs inside a track name', async () => {
    const row = ['2', 'Hello\tWorld', 'Artist', '90'].join(scripts.FIELD);
    const payload = ['Mix', '2', '4', '1', row].join('\n');
    execFile.mockImplementationOnce((cmd, args, opts, cb) => {
      if (typeof opts === 'function') cb = opts;
      cb(null, `${payload}\n`, '');
    });
    const playlist = await ipcHandlers['music:getPlaylist']();
    expect(playlist.tracks[0].name).toBe('Hello\tWorld');
    expect(execFile.mock.calls.at(-1)[1][1]).toBe(scripts.playlist());
  });

  test('music:getArtwork passes the temp path as argv instead of interpolating it', async () => {
    const hostile = 'it\'s "quoted" & weird';
    app.getPath.mockImplementation((name) => {
      if (name === 'temp') return hostile;
      return `/tmp/argon-test-${name}`;
    });
    execFile.mockClear();
    try {
      await ipcHandlers['music:getArtwork']();
      const argv = execFile.mock.calls.at(-1)[1];
      expect(argv[0]).toBe('-e');
      expect(argv[1]).toBe(scripts.artworkScript());
      expect(argv[1]).not.toContain(hostile);
      expect(argv[2]).toBe('--');
      expect(argv[3]).toContain(hostile);
      expect(argv[3]).toContain('winamp_artwork.jpg');
    } finally {
      app.getPath.mockImplementation((name) => `/tmp/argon-test-${name}`);
    }
  });
});
