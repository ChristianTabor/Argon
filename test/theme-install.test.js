const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeZip } = require('./helpers/zip');

const mockRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-theme-install-'));
const mockPath = path;
const ipcHandlers = {};
const mockWindow = {
  loadFile: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  on: jest.fn(),
  webContents: { send: jest.fn(), openDevTools: jest.fn() },
  isVisible: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  isDestroyed: jest.fn(() => false),
  isMinimized: jest.fn(() => false),
  isAlwaysOnTop: jest.fn(() => false),
  hide: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  restore: jest.fn(),
  minimize: jest.fn(),
  close: jest.fn(),
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

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    removeListener: jest.fn(),
    getPath: jest.fn((name) => mockPath.join(mockRoot, name)),
    quit: jest.fn(),
    focus: jest.fn(),
    dock: { hide: jest.fn(), show: jest.fn() },
  },
  BrowserWindow: Object.assign(jest.fn(() => mockWindow), {
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
    getDisplayMatching: jest.fn(() => ({ workArea: { width: 1920, height: 1080, x: 0, y: 0 } })),
  },
  globalShortcut: { register: jest.fn(), unregisterAll: jest.fn() },
  Tray: jest.fn(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    popUpContextMenu: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
  })),
  Menu: { buildFromTemplate: jest.fn((template) => template) },
  nativeImage: {
    createFromBuffer: jest.fn(() => ({ setTemplateImage: jest.fn() })),
  },
  Notification: Object.assign(jest.fn(() => ({ show: jest.fn() })), {
    isSupported: jest.fn(() => true),
  }),
}));

const { dialog } = require('electron');

function zipPath(name) {
  return path.join(mockRoot, name);
}

function choose(file) {
  dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [file] });
}

describe('themes:install and themes:load', () => {
  beforeAll(async () => {
    require('../main.js');
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterAll(() => {
    fs.rmSync(mockRoot, { recursive: true, force: true });
  });

  test('loads a built-in theme from disk', () => {
    const loaded = ipcHandlers['themes:load']({}, 'classic-winamp');
    expect(loaded.meta.name).toBe('Classic Winamp');
    expect(loaded.css.length).toBeGreaterThan(0);
    expect(ipcHandlers['themes:load']({}, '../package')).toBeNull();
    expect(ipcHandlers['themes:load']({}, 'no-such-theme')).toBeNull();
  });

  test('a canceled dialog installs nothing', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await ipcHandlers['themes:install']()).toBeNull();
  });

  test('installs a zip with theme.json at the root', async () => {
    const file = zipPath('plain-theme.zip');
    writeZip(file, [{ name: 'theme.json', data: '{"name":"Plain","author":"Test"}' }]);
    choose(file);
    const result = await ipcHandlers['themes:install']();
    expect(result).toEqual({ success: true, themeId: 'plain-theme', name: 'Plain' });
    const installed = path.join(mockRoot, 'userData', 'themes', 'plain-theme', 'theme.json');
    expect(fs.existsSync(installed)).toBe(true);
  });

  test('hoists a theme packed inside a single folder', async () => {
    const file = zipPath('nested-theme.zip');
    writeZip(file, [
      { name: 'Cool/theme.json', data: '{"name":"Cool","author":"Test"}' },
      { name: 'Cool/theme.css', data: ':root { --base-width: 300; }' },
    ]);
    choose(file);
    const result = await ipcHandlers['themes:install']();
    expect(result).toEqual({ success: true, themeId: 'nested-theme', name: 'Cool' });
    const dest = path.join(mockRoot, 'userData', 'themes', 'nested-theme');
    expect(fs.existsSync(path.join(dest, 'theme.json'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'Cool'))).toBe(false);
  });

  test('rejects a zip with no theme.json and removes the extracted folder', async () => {
    const file = zipPath('empty-theme.zip');
    writeZip(file, [{ name: 'readme.txt', data: 'hello' }]);
    choose(file);
    const result = await ipcHandlers['themes:install']();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/theme\.json/);
    expect(fs.existsSync(path.join(mockRoot, 'userData', 'themes', 'empty-theme'))).toBe(false);
  });

  test('rejects a zip that contains a parent-directory entry', async () => {
    const file = zipPath('evil-theme.zip');
    writeZip(file, [
      { name: '../outside.txt', data: 'nope' },
      { name: 'theme.json', data: '{"name":"Evil"}' },
    ]);
    choose(file);
    const result = await ipcHandlers['themes:install']();
    expect(result).toEqual({ success: false, error: 'Invalid theme: unsafe path in archive' });
    expect(fs.existsSync(path.join(mockRoot, 'userData', 'themes', 'outside.txt'))).toBe(false);
    expect(fs.existsSync(path.join(mockRoot, 'userData', 'themes', 'evil-theme'))).toBe(false);
  });
});
