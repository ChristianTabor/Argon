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
const mockBusyShortcuts = new Set(); // accelerators another app holds, so register() fails

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
  shell: { openPath: jest.fn(), openExternal: jest.fn() },
  systemPreferences: { isTrustedAccessibilityClient: jest.fn(() => true) },
  screen: {
    getDisplayMatching: jest.fn(() => ({
      workArea: { width: 1920, height: 1080, x: 0, y: 0 },
    })),
  },
  globalShortcut: {
    register: jest.fn((key, cb) => {
      if (mockBusyShortcuts.has(key)) return false;
      registeredShortcuts[key] = cb;
      return true;
    }),
    unregister: jest.fn((key) => { delete registeredShortcuts[key]; }),
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
      cb(null, 'playing||Test Song||Test Artist||Test Album||240||120||75||false||off||256||44100\n', '');
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

describe('Bit rate and sample rate', () => {
  const { execFile } = require('child_process');
  const stateWith = (tail) => `playing||Song||Artist||Album||240||120||75||false||off${tail}\n`;
  const getStateWith = (tail) => {
    execFile.mockImplementationOnce((cmd, args, opts, cb) => cb(null, stateWith(tail), ''));
    return ipcHandlers['music:getState']();
  };

  test('music:getState returns the track bit rate and sample rate', async () => {
    const state = await ipcHandlers['music:getState']();
    expect(state.bitRate).toBe(256);
    expect(state.sampleRate).toBe(44100);
  });

  test('state script appends the rates after the existing fields', async () => {
    execFile.mockClear();
    await ipcHandlers['music:getState']();
    const script = execFile.mock.calls[0][1][1];
    expect(script).toContain('bit rate of current track');
    expect(script).toContain('sample rate of current track');
    expect(script).toMatch(/repeatMode & "\|\|" & trackBitRate & "\|\|" & trackSampleRate\s/);
  });

  test('lossless and hi-res values pass through', async () => {
    const state = await getStateWith('||1411||96000');
    expect(state.bitRate).toBe(1411);
    expect(state.sampleRate).toBe(96000);
  });

  test.each([
    ['zero', '||0||0'],
    ['missing value', '||missing value||missing value'],
    ['empty', '||||'],
    ['non-numeric', '||abc||xyz'],
    ['absent (older output)', ''],
  ])('unknown rates (%s) become null', async (_, tail) => {
    const state = await getStateWith(tail);
    expect(state.bitRate).toBeNull();
    expect(state.sampleRate).toBeNull();
    expect(state.track).toBe('Song');
  });

  test('an osascript failure gives null rates', async () => {
    execFile.mockImplementationOnce((cmd, args, opts, cb) => cb(new Error('boom')));
    const state = await ipcHandlers['music:getState']();
    expect(state.state).toBe('stopped');
    expect(state.bitRate).toBeNull();
    expect(state.sampleRate).toBeNull();
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
  const MEDIA = ['MediaPlayPause', 'MediaNextTrack', 'MediaPreviousTrack'];
  const GLOBAL = ['CommandOrControl+Shift+Up', 'CommandOrControl+Shift+Down', 'CommandOrControl+Shift+M'];

  // Put both toggles back to a fresh install's state: media keys off, Cmd+Shift shortcuts on
  afterEach(() => {
    const { systemPreferences } = require('electron');
    mockBusyShortcuts.clear();
    systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
    ipcHandlers['prefs:save']({}, { mediaKeys: false, globalShortcuts: true });
  });

  test('a fresh install registers the Cmd+Shift shortcuts and leaves the media keys alone', () => {
    // Startup ran against no prefs.json
    expect(Object.keys(registeredShortcuts).sort()).toEqual([...GLOBAL].sort());
    expect(ipcHandlers['prefs:load']()).toEqual(expect.objectContaining({ mediaKeys: false, globalShortcuts: true }));
  });

  test('turning media keys on registers them without touching the other shortcuts', () => {
    const { globalShortcut } = require('electron');
    globalShortcut.unregister.mockClear();
    ipcHandlers['prefs:save']({}, { mediaKeys: true });
    for (const key of MEDIA) expect(registeredShortcuts[key]).toEqual(expect.any(Function));
    for (const key of GLOBAL) expect(registeredShortcuts[key]).toEqual(expect.any(Function));
    expect(globalShortcut.unregister.mock.calls.map((c) => c[0]).sort()).toEqual([...MEDIA].sort());
  });

  test('turning media keys off unregisters them', () => {
    ipcHandlers['prefs:save']({}, { mediaKeys: true });
    ipcHandlers['prefs:save']({}, { mediaKeys: false });
    for (const key of MEDIA) expect(registeredShortcuts[key]).toBeUndefined();
    for (const key of GLOBAL) expect(registeredShortcuts[key]).toEqual(expect.any(Function));
  });

  test('turning global shortcuts off unregisters the Cmd+Shift accelerators only', () => {
    ipcHandlers['prefs:save']({}, { mediaKeys: true });
    ipcHandlers['prefs:save']({}, { globalShortcuts: false });
    for (const key of GLOBAL) expect(registeredShortcuts[key]).toBeUndefined();
    for (const key of MEDIA) expect(registeredShortcuts[key]).toEqual(expect.any(Function));
  });

  test('re-applying a setting unregisters before it registers again', () => {
    const { globalShortcut } = require('electron');
    ipcHandlers['prefs:save']({}, { globalShortcuts: true });
    const key = 'CommandOrControl+Shift+M';
    const unregistered = globalShortcut.unregister.mock.invocationCallOrder[
      globalShortcut.unregister.mock.calls.map((c) => c[0]).lastIndexOf(key)];
    const registered = globalShortcut.register.mock.invocationCallOrder[
      globalShortcut.register.mock.calls.map((c) => c[0]).lastIndexOf(key)];
    expect(unregistered).toBeLessThan(registered);
  });

  test('the media keys run the Music commands', () => {
    const { execFile } = require('child_process');
    ipcHandlers['prefs:save']({}, { mediaKeys: true });
    execFile.mockClear();
    registeredShortcuts.MediaNextTrack();
    expect(execFile.mock.calls[0][1][1]).toContain('next track');
  });

  test('mini mode shortcut sends IPC to renderer', () => {
    registeredShortcuts['CommandOrControl+Shift+M']();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('toggle-mini-mode');
  });

  test('prefs:save only takes booleans for the shortcut prefs', () => {
    const fs = require('fs');
    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, { mediaKeys: 'yes', globalShortcuts: 0 });
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1])).toEqual(
      expect.objectContaining({ mediaKeys: false, globalShortcuts: true }));
    expect(registeredShortcuts.MediaPlayPause).toBeUndefined();
  });

  test('the shortcut prefs are saved', () => {
    const fs = require('fs');
    fs.writeFileSync.mockClear();
    ipcHandlers['prefs:save']({}, { mediaKeys: true, globalShortcuts: false });
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1])).toEqual(
      expect.objectContaining({ mediaKeys: true, globalShortcuts: false }));
  });

  describe('tray menu', () => {
    const item = (label) => lastTrayMenu().find((i) => i.label === label);

    test('has a checkbox for each group that follows the prefs', () => {
      expect(item('Capture Media Keys')).toEqual(expect.objectContaining({ type: 'checkbox', checked: false }));
      expect(item('Global Shortcuts (Cmd+Shift)')).toEqual(expect.objectContaining({ type: 'checkbox', checked: true }));
    });

    test('Capture Media Keys registers the keys, saves the pref and updates the checkbox', () => {
      const fs = require('fs');
      fs.writeFileSync.mockClear();
      item('Capture Media Keys').click();
      expect(registeredShortcuts.MediaPlayPause).toEqual(expect.any(Function));
      expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).mediaKeys).toBe(true);
      expect(item('Capture Media Keys').checked).toBe(true);

      item('Capture Media Keys').click();
      expect(registeredShortcuts.MediaPlayPause).toBeUndefined();
      expect(JSON.parse(fs.writeFileSync.mock.calls[1][1]).mediaKeys).toBe(false);
      expect(item('Capture Media Keys').checked).toBe(false);
    });

    test('Global Shortcuts unregisters the Cmd+Shift accelerators and saves the pref', () => {
      const fs = require('fs');
      fs.writeFileSync.mockClear();
      item('Global Shortcuts (Cmd+Shift)').click();
      expect(registeredShortcuts['CommandOrControl+Shift+M']).toBeUndefined();
      expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).globalShortcuts).toBe(false);
      expect(item('Global Shortcuts (Cmd+Shift)').checked).toBe(false);
    });

    test('turning media keys on asks macOS for Accessibility access; the pref route does not', () => {
      const { systemPreferences } = require('electron');
      systemPreferences.isTrustedAccessibilityClient.mockClear();
      ipcHandlers['prefs:save']({}, { mediaKeys: true });
      expect(systemPreferences.isTrustedAccessibilityClient).toHaveBeenLastCalledWith(false);
      item('Capture Media Keys').click(); // off
      item('Capture Media Keys').click(); // on
      expect(systemPreferences.isTrustedAccessibilityClient).toHaveBeenLastCalledWith(true);
    });

    test('shows a link to Accessibility settings when media keys are on but not trusted', () => {
      const { systemPreferences, shell } = require('electron');
      systemPreferences.isTrustedAccessibilityClient.mockReturnValue(false);
      ipcHandlers['prefs:save']({}, { mediaKeys: true });
      const warning = item('Media Keys Need Accessibility Permission…');
      expect(warning).toBeDefined();
      warning.click();
      expect(shell.openExternal).toHaveBeenCalledWith(expect.stringContaining('Privacy_Accessibility'));

      ipcHandlers['prefs:save']({}, { mediaKeys: false });
      expect(item('Media Keys Need Accessibility Permission…')).toBeUndefined();
    });

    test('media keys refused for missing Accessibility permission are not reported as in use', () => {
      const { systemPreferences } = require('electron');
      systemPreferences.isTrustedAccessibilityClient.mockReturnValue(false);
      // Electron's register() returns false for media keys when the app isn't trusted
      ['MediaPlayPause', 'MediaNextTrack', 'MediaPreviousTrack'].forEach((key) => mockBusyShortcuts.add(key));
      ipcHandlers['prefs:save']({}, { mediaKeys: true });
      expect(item('Media Keys Need Accessibility Permission…')).toBeDefined();
      expect(lastTrayMenu().some((i) => String(i.label).startsWith('In use by another app'))).toBe(false);
    });

    test('shows no Accessibility warning while media keys are off', () => {
      const { systemPreferences } = require('electron');
      systemPreferences.isTrustedAccessibilityClient.mockReturnValue(false);
      ipcHandlers['prefs:save']({}, { globalShortcuts: true });
      expect(item('Media Keys Need Accessibility Permission…')).toBeUndefined();
    });

    test('lists shortcuts another app already holds, and clears them when they are turned off', () => {
      mockBusyShortcuts.add('CommandOrControl+Shift+M');
      ipcHandlers['prefs:save']({}, { globalShortcuts: true });
      expect(registeredShortcuts['CommandOrControl+Shift+M']).toBeUndefined();
      expect(item('In use by another app: Cmd+Shift+M')).toEqual(expect.objectContaining({ enabled: false }));

      ipcHandlers['prefs:save']({}, { globalShortcuts: false });
      expect(lastTrayMenu().some((i) => String(i.label).startsWith('In use by another app'))).toBe(false);
    });
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
      expect(saved).toEqual({ theme: 'classic-winamp', miniMode: true, hideDockIcon: true, mediaKeys: true });
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

describe('Shortcut prefs at startup', () => {
  // Loads a second copy of main.js against a saved prefs.json. The electron/fs mocks are shared
  // with the first copy, so restore its handlers, shortcuts and fs mocks afterwards.
  const startWith = async (saved) => {
    const fs = require('fs');
    fs.existsSync.mockImplementation((p) => String(p).endsWith('prefs.json'));
    fs.readFileSync.mockImplementation(() => JSON.stringify(saved));
    for (const key of Object.keys(registeredShortcuts)) delete registeredShortcuts[key];
    jest.isolateModules(() => require('../main.js'));
    await new Promise(setImmediate); // let app.whenReady().then(...) run
    return Object.keys(registeredShortcuts).sort();
  };

  const run = async (saved, check) => {
    const fs = require('fs');
    const savedHandlers = { ...ipcHandlers };
    const savedShortcuts = { ...registeredShortcuts };
    try {
      check(await startWith(saved));
    } finally {
      fs.existsSync.mockImplementation(() => false);
      fs.readFileSync.mockImplementation(() => '{}');
      for (const key of Object.keys(registeredShortcuts)) delete registeredShortcuts[key];
      Object.assign(ipcHandlers, savedHandlers);
      Object.assign(registeredShortcuts, savedShortcuts);
    }
  };

  const MEDIA = ['MediaNextTrack', 'MediaPlayPause', 'MediaPreviousTrack'];
  const GLOBAL = ['CommandOrControl+Shift+Down', 'CommandOrControl+Shift+M', 'CommandOrControl+Shift+Up'];

  test('an existing prefs.json without mediaKeys keeps the media keys on', async () => {
    await run({ theme: 'sakura' }, (keys) => expect(keys).toEqual([...MEDIA, ...GLOBAL].sort()));
  });

  test('saved mediaKeys: false leaves the media keys alone', async () => {
    await run({ mediaKeys: false }, (keys) => expect(keys).toEqual(GLOBAL));
  });

  test('saved globalShortcuts: false registers no Cmd+Shift shortcuts', async () => {
    await run({ mediaKeys: true, globalShortcuts: false }, (keys) => expect(keys).toEqual(MEDIA));
  });

  test('both off registers nothing', async () => {
    await run({ mediaKeys: false, globalShortcuts: false }, (keys) => expect(keys).toEqual([]));
  });

  test('will-quit still unregisters everything', () => {
    const { app, globalShortcut } = require('electron');
    app.on.mock.calls.find((c) => c[0] === 'will-quit')[1]();
    expect(globalShortcut.unregisterAll).toHaveBeenCalled();
  });
});
