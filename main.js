const { app, BrowserWindow, ipcMain, dialog, shell, screen, globalShortcut, systemPreferences, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Paths
const THEMES_DIR = path.join(__dirname, 'src', 'themes');
const USER_THEMES_DIR = path.join(app.getPath('userData'), 'themes');
const PREFS_PATH = path.join(app.getPath('userData'), 'prefs.json');

let mainWindow;
let tray = null;
let trayMenu = null;
let windowLocked = false;
let prevAlwaysOnTop = false;
let isSnapped = false;
let lastProgrammaticMove = 0;
let dockIconHidden = false;
let mediaKeysEnabled = false;
let globalShortcutsEnabled = true;
let shortcutProblems = { untrusted: false, failed: {} };
let trayTrack = '';
let trayArtist = '';

function snapToBottomRight() {
  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const { width: screenW, height: screenH, x: screenX, y: screenY } = display.workArea;
  const [winW, winH] = mainWindow.getSize();
  lastProgrammaticMove = Date.now();
  mainWindow.setPosition(
    screenX + screenW - winW,
    screenY + screenH - winH
  );
  isSnapped = true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 240,
    minHeight: 280,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 },
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.setAlwaysOnTop(false);

  // Detect manual drags to clear snap state
  mainWindow.on('move', () => {
    if (Date.now() - lastProgrammaticMove < 500) return;
    isSnapped = false;
  });

  // Keep the tray's Show/Hide Window label in sync with the window
  const refreshTrayMenu = () => updateTrayMenu(trayTrack, trayArtist);
  mainWindow.on('show', refreshTrayMenu);
  mainWindow.on('hide', refreshTrayMenu);
  mainWindow.on('focus', refreshTrayMenu);
  mainWindow.on('blur', refreshTrayMenu);
  mainWindow.on('minimize', refreshTrayMenu);
  mainWindow.on('restore', refreshTrayMenu);
  mainWindow.on('closed', refreshTrayMenu);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Ensure user themes directory exists
function ensureUserThemesDir() {
  if (!fs.existsSync(USER_THEMES_DIR)) {
    fs.mkdirSync(USER_THEMES_DIR, { recursive: true });
  }
}

// Load preferences
function loadPrefs() {
  try {
    if (fs.existsSync(PREFS_PATH)) {
      const saved = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
      // Existing installs captured the media keys before this was a choice, so keep it on for them
      if (saved && typeof saved === 'object' && !Array.isArray(saved) && typeof saved.mediaKeys !== 'boolean') {
        saved.mediaKeys = true;
      }
      return saved;
    }
  } catch (e) { /* ignore */ }
  return {
    theme: 'classic-winamp', visualizer: 'bars', alwaysOnTop: false, hideDockIcon: false,
    mediaKeys: false, globalShortcuts: true,
  };
}

// Save preferences
function savePrefs(prefs) {
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

// Merge changes into the saved prefs, so one writer doesn't wipe keys another one owns
function updatePrefs(changes) {
  const current = loadPrefs();
  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  savePrefs({ ...base, ...changes });
}

// AppleScript execution helper
function runAppleScript(script) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

// ─── Apple Music IPC Handlers ────────────────────────────────────────────────

ipcMain.handle('music:getState', async () => {
  try {
    const script = `
      tell application "Music"
        set playerState to player state as string
        set trackName to ""
        set trackArtist to ""
        set trackAlbum to ""
        set trackDuration to 0
        set playerPos to 0
        set playerVol to sound volume
        set isShuffling to false
        set repeatMode to "off"

        if playerState is not "stopped" then
          set trackName to name of current track
          set trackArtist to artist of current track
          set trackAlbum to album of current track
          set trackDuration to duration of current track
          set playerPos to player position
          set isShuffling to shuffle enabled
          set repeatMode to song repeat as string
        end if

        return playerState & "||" & trackName & "||" & trackArtist & "||" & trackAlbum & "||" & trackDuration & "||" & playerPos & "||" & playerVol & "||" & isShuffling & "||" & repeatMode
      end tell
    `;
    const result = await runAppleScript(script);
    const parts = result.split('||');
    return {
      state: parts[0] || 'stopped',
      track: parts[1] || '',
      artist: parts[2] || '',
      album: parts[3] || '',
      duration: parseFloat(parts[4]) || 0,
      position: parseFloat(parts[5]) || 0,
      volume: parseInt(parts[6]) || 50,
      shuffle: parts[7] === 'true',
      repeat: parts[8] || 'off',
    };
  } catch (e) {
    return { state: 'stopped', track: '', artist: '', album: '', duration: 0, position: 0, volume: 50, shuffle: false, repeat: 'off' };
  }
});

ipcMain.handle('music:getArtwork', async () => {
  try {
    const script = `
      tell application "Music"
        if player state is not stopped then
          try
            set artData to raw data of artwork 1 of current track
            set artFormat to format of artwork 1 of current track
            return artFormat as string
          on error
            return "none"
          end try
        else
          return "none"
        end if
      end tell
    `;
    // Get artwork as temp file
    const tmpPath = path.join(app.getPath('temp'), 'winamp_artwork.jpg');
    const artScript = `
      tell application "Music"
        if player state is not stopped then
          try
            set artData to data of artwork 1 of current track
            set tmpFile to POSIX file "${tmpPath}"
            set fileRef to open for access tmpFile with write permission
            set eof fileRef to 0
            write artData to fileRef
            close access fileRef
            return "${tmpPath}"
          on error errMsg
            try
              close access tmpFile
            end try
            return "none"
          end try
        else
          return "none"
        end if
      end tell
    `;
    const result = await runAppleScript(artScript);
    if (result !== 'none' && fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath);
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    }
    return null;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('music:play', () => runAppleScript('tell application "Music" to play'));
ipcMain.handle('music:pause', () => runAppleScript('tell application "Music" to pause'));
ipcMain.handle('music:playpause', () => runAppleScript('tell application "Music" to playpause'));
ipcMain.handle('music:next', () => runAppleScript('tell application "Music" to next track'));
ipcMain.handle('music:prev', () => runAppleScript('tell application "Music" to previous track'));
ipcMain.handle('music:setVolume', (_, vol) => {
  const v = Number(vol);
  if (!Number.isFinite(v) || v < 0 || v > 100) return;
  return runAppleScript(`tell application "Music" to set sound volume to ${Math.round(v)}`);
});
ipcMain.handle('music:setPosition', (_, pos) => {
  const p = Number(pos);
  if (!Number.isFinite(p) || p < 0) return;
  return runAppleScript(`tell application "Music" to set player position to ${p}`);
});
ipcMain.handle('music:toggleShuffle', () => runAppleScript('tell application "Music" to set shuffle enabled to not shuffle enabled'));
ipcMain.handle('music:toggleRepeat', async () => {
  const script = `
    tell application "Music"
      if song repeat is off then
        set song repeat to all
        return "all"
      else if song repeat is all then
        set song repeat to one
        return "one"
      else
        set song repeat to off
        return "off"
      end if
    end tell
  `;
  return runAppleScript(script);
});

ipcMain.handle('music:getPlaylist', async () => {
  try {
    const script = `
      tell application "Music"
        if player state is stopped then return "stopped"

        set curPlaylist to current playlist
        set pName to name of curPlaylist
        set tCount to count of tracks of curPlaylist
        set curIdx to index of current track

        set s to curIdx - 15
        if s < 1 then set s to 1
        set e to s + 29
        if e > tCount then set e to tCount
        if (e - s) < 29 and s > 1 then
          set s to e - 29
          if s < 1 then set s to 1
        end if

        set r to pName & return & curIdx & return & tCount & return & s & return

        repeat with i from s to e
          tell track i of curPlaylist
            set tN to name
            set tA to artist
            set tD to duration
          end tell
          set r to r & i & tab & tN & tab & tA & tab & (tD as integer) & return
        end repeat

        return r
      end tell
    `;
    const result = await new Promise((resolve, reject) => {
      execFile('osascript', ['-e', script], { timeout: 15000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      });
    });

    if (result === 'stopped') return null;

    const lines = result.split(/\r?\n|\r/).filter(Boolean);
    if (lines.length < 4) return null;

    const playlistName = lines[0];
    const currentIndex = parseInt(lines[1]) || 0;
    const count = parseInt(lines[2]) || 0;
    const startIndex = parseInt(lines[3]) || 1;
    const tracks = lines.slice(4).map(line => {
      const parts = line.split('\t');
      return {
        index: parseInt(parts[0]) || 0,
        name: parts[1] || '',
        artist: parts[2] || '',
        duration: parseInt(parts[3]) || 0,
      };
    });

    return { name: playlistName, currentIndex, count, startIndex, tracks };
  } catch (e) {
    return null;
  }
});

ipcMain.handle('music:playTrackIndex', (_, index) => {
  const i = Math.round(Number(index));
  if (!Number.isFinite(i) || i < 1) return;
  return runAppleScript(`tell application "Music" to play track ${i} of current playlist`);
});

ipcMain.handle('music:getLyrics', async () => {
  try {
    const script = `
      tell application "Music"
        if player state is not stopped then
          try
            return lyrics of current track
          on error
            return ""
          end try
        else
          return ""
        end if
      end tell
    `;
    return await runAppleScript(script);
  } catch (e) {
    return '';
  }
});

// ─── Notification IPC ───────────────────────────────────────────────────────

ipcMain.handle('notify:trackChange', (_, track, artist, album) => {
  if (!Notification.isSupported()) return;
  const title = (typeof track === 'string' ? track : 'Unknown Track').slice(0, 200);
  const body = ([artist, album].filter(s => typeof s === 'string').join(' — ') || 'Unknown Artist').slice(0, 500);
  const notif = new Notification({ title, body, silent: true });
  notif.show();
});

// ─── Tray IPC ───────────────────────────────────────────────────────────────

ipcMain.handle('tray:updateTrack', (_, track, artist) => {
  if (!tray) return;
  updateTrayMenu(track, artist);
});

// ─── Theme IPC Handlers ─────────────────────────────────────────────────────

ipcMain.handle('themes:list', () => {
  ensureUserThemesDir();
  const themes = [];

  // Built-in themes
  if (fs.existsSync(THEMES_DIR)) {
    for (const dir of fs.readdirSync(THEMES_DIR)) {
      const jsonPath = path.join(THEMES_DIR, dir, 'theme.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          meta.id = dir;
          meta.builtin = true;
          meta.path = path.join(THEMES_DIR, dir);
          themes.push(meta);
        } catch (e) { /* skip */ }
      }
    }
  }

  // User-installed themes
  for (const dir of fs.readdirSync(USER_THEMES_DIR)) {
    const jsonPath = path.join(USER_THEMES_DIR, dir, 'theme.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        meta.id = dir;
        meta.builtin = false;
        meta.path = path.join(USER_THEMES_DIR, dir);
        themes.push(meta);
      } catch (e) { /* skip */ }
    }
  }

  return themes;
});

ipcMain.handle('themes:load', (_, themeId) => {
  if (typeof themeId !== 'string' || /[\/\\]|\.\./.test(themeId) || themeId.length === 0) {
    return null;
  }

  const locations = [
    path.join(THEMES_DIR, themeId),
    path.join(USER_THEMES_DIR, themeId),
  ];

  for (const dir of locations) {
    const resolved = path.resolve(dir);
    if (!resolved.startsWith(path.resolve(THEMES_DIR)) && !resolved.startsWith(path.resolve(USER_THEMES_DIR))) {
      return null;
    }
    const cssPath = path.join(dir, 'theme.css');
    const jsonPath = path.join(dir, 'theme.json');
    if (fs.existsSync(cssPath) && fs.existsSync(jsonPath)) {
      return {
        css: fs.readFileSync(cssPath, 'utf-8'),
        meta: JSON.parse(fs.readFileSync(jsonPath, 'utf-8')),
      };
    }
  }
  return null;
});

ipcMain.handle('themes:install', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Install Theme',
    filters: [
      { name: 'Winamp Theme', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  ensureUserThemesDir();

  // Extract zip to user themes
  try {
    const themeName = path.basename(filePath, path.extname(filePath));
    const destDir = path.join(USER_THEMES_DIR, themeName);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    await new Promise((resolve, reject) => {
      execFile('unzip', ['-o', filePath, '-d', destDir], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verify theme.json exists
    if (!fs.existsSync(path.join(destDir, 'theme.json'))) {
      // Check if files are nested in a subdirectory
      const entries = fs.readdirSync(destDir);
      if (entries.length === 1) {
        const nested = path.join(destDir, entries[0]);
        if (fs.statSync(nested).isDirectory() && fs.existsSync(path.join(nested, 'theme.json'))) {
          // Move files up
          for (const f of fs.readdirSync(nested)) {
            fs.renameSync(path.join(nested, f), path.join(destDir, f));
          }
          fs.rmdirSync(nested);
        }
      }
    }

    if (fs.existsSync(path.join(destDir, 'theme.json'))) {
      const meta = JSON.parse(fs.readFileSync(path.join(destDir, 'theme.json'), 'utf-8'));
      return { success: true, themeId: themeName, name: meta.name };
    } else {
      fs.rmSync(destDir, { recursive: true });
      return { success: false, error: 'Invalid theme: missing theme.json' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('themes:openFolder', () => {
  ensureUserThemesDir();
  shell.openPath(USER_THEMES_DIR);
});

// ─── Window IPC Handlers ────────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:close', () => mainWindow.close());
ipcMain.handle('window:toggleOnTop', () => {
  const isOnTop = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!isOnTop);
  updateTrayMenu(trayTrack, trayArtist); // a pinned window counts as in front for Show/Hide Window
  return !isOnTop;
});

ipcMain.handle('window:snapBottomRight', () => {
  snapToBottomRight();
});

ipcMain.handle('window:setMinMaxSize', (_, minW, minH, maxW, maxH) => {
  if (minW && minH) mainWindow.setMinimumSize(minW, minH);
  if (maxW && maxH) mainWindow.setMaximumSize(maxW, maxH);
});

ipcMain.handle('window:resize', (_, w, h) => {
  mainWindow.setSize(Math.round(w), Math.round(h), false);
});

ipcMain.handle('window:applyConstraints', (_, minW, minH, maxW, maxH, targetW, targetH) => {
  // Reset min to absolute minimum first to avoid conflicts during transition
  mainWindow.setMinimumSize(200, 200);
  if (maxW && maxH) mainWindow.setMaximumSize(Math.round(maxW), Math.round(maxH));
  if (minW && minH) mainWindow.setMinimumSize(Math.round(minW), Math.round(minH));
  if (targetW && targetH) {
    lastProgrammaticMove = Date.now();
    mainWindow.setSize(Math.round(targetW), Math.round(targetH), false);
    // Re-snap to corner if window was snapped before the resize
    if (isSnapped) snapToBottomRight();
  }
});

ipcMain.handle('window:toggleLock', () => {
  windowLocked = !windowLocked;
  mainWindow.setMovable(!windowLocked);
  return windowLocked;
});

ipcMain.handle('window:setVibrancy', (_, vibrancy) => {
  mainWindow.setVibrancy(vibrancy || null);
  if (!vibrancy) {
    mainWindow.setBackgroundColor('#00000000');
  }
});

// ─── Prefs IPC ──────────────────────────────────────────────────────────────

ipcMain.handle('prefs:load', () => loadPrefs());
ipcMain.handle('prefs:save', (_, prefs) => {
  if (typeof prefs !== 'object' || prefs === null || Array.isArray(prefs)) return;
  const allowed = {
    theme: 'string', visualizer: 'string', alwaysOnTop: 'boolean',
    transparency: 'number', darkText: 'boolean', eqBands: 'object',
    eqPreset: 'string', miniMode: 'boolean', hideDockIcon: 'boolean',
    mediaKeys: 'boolean', globalShortcuts: 'boolean',
  };
  const sanitized = {};
  for (const [key, type] of Object.entries(allowed)) {
    if (key in prefs && typeof prefs[key] === type) {
      sanitized[key] = prefs[key];
    }
  }
  // Merge, so keys the renderer doesn't send (hideDockIcon, owned by the tray menu) survive
  updatePrefs(sanitized);
  // Shortcut changes apply right away
  if ('mediaKeys' in sanitized) setShortcutGroup('media', sanitized.mediaKeys);
  if ('globalShortcuts' in sanitized) setShortcutGroup('global', sanitized.globalShortcuts);
});

// ─── Tray ───────────────────────────────────────────────────────────────────

function createTray() {
  // Create a 18x18 template image (simple music note shape)
  const size = 18;
  const buf = Buffer.alloc(size * size * 4, 0);
  // Draw a simple filled circle (note head) at bottom-left and a vertical line (stem)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Note head: circle at (6, 13) radius 3
      const dx1 = x - 6, dy1 = y - 13;
      const inHead = (dx1 * dx1 + dy1 * dy1) <= 9;
      // Stem: vertical line x=9, y from 3 to 12
      const inStem = (x >= 9 && x <= 10) && (y >= 3 && y <= 12);
      // Flag: diagonal from (10,3) to (14,6)
      const inFlag = (x >= 10 && x <= 14) && (y >= 3 && y <= 6) && (x - 10 >= y - 5);
      if (inHead || inStem || inFlag) {
        buf[idx] = 0;     // R
        buf[idx+1] = 0;   // G
        buf[idx+2] = 0;   // B
        buf[idx+3] = 255; // A
      }
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size, scaleFactor: 1 });
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Argon');
  updateTrayMenu('Not Playing', '');

  // Click brings the window up and opens the menu. Right-click (or Control-click) opens the
  // menu without moving the window.
  tray.on('click', (event) => {
    if (!(event && event.ctrlKey)) {
      showMainWindow();
      // Focus lands asynchronously, so label the menu for the window that's coming to the front
      updateTrayMenu(trayTrack, trayArtist, true);
    }
    tray.popUpContextMenu(trayMenu);
  });
  tray.on('right-click', () => tray.popUpContextMenu(trayMenu));
}

// Up and in front of other windows: focused, or pinned always on top
function mainWindowInFront() {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()
    && (mainWindow.isFocused() || mainWindow.isAlwaysOnTop()));
}

// Bring the window to the front. Closing the window destroys it, so recreate it then.
function showMainWindow() {
  // From the tray another app is usually active, and with the Dock icon hidden Argon isn't in
  // Cmd+Tab, so take focus or the window can stay buried behind that app
  app.focus({ steal: true });
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

// Optional Dock icon (tray menu → Show Dock Icon)
function setDockIconHidden(hidden) {
  dockIconHidden = hidden;
  if (!app.dock) return;
  if (!hidden) {
    app.dock.show();
    return;
  }
  const hadFocus = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && mainWindow.isFocused();
  app.dock.hide();
  if (!hadFocus) return;
  // Becoming an accessory app lands asynchronously and deactivates Argon: the window stays up
  // but loses focus, and re-focusing too early gets undone. Re-focus 100ms after the last
  // deactivation, and only listen briefly so a later app switch by the user isn't undone.
  let pending;
  const refocusSoon = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 100);
  };
  app.on('did-resign-active', refocusSoon);
  setTimeout(() => app.removeListener('did-resign-active', refocusSoon), 1000);
}

function updateTrayMenu(track, artist, windowInFront = mainWindowInFront()) {
  if (!tray) return;
  trayTrack = track;
  trayArtist = artist;
  const trackLabel = track || 'Not Playing';
  const artistLabel = artist || '';

  // Not attached with setContextMenu: on macOS that opens the menu on every click (see createTray)
  trayMenu = Menu.buildFromTemplate([
    { label: trackLabel, enabled: false },
    ...(artistLabel ? [{ label: artistLabel, enabled: false }] : []),
    { type: 'separator' },
    { label: 'Play/Pause', click: () => runAppleScript('tell application "Music" to playpause') },
    { label: 'Next Track', click: () => runAppleScript('tell application "Music" to next track') },
    { label: 'Previous Track', click: () => runAppleScript('tell application "Music" to previous track') },
    { type: 'separator' },
    // Bound to the label, so the item does what it says even if focus moves while the menu is open
    { label: windowInFront ? 'Hide Window' : 'Show Window', click: windowInFront ? hideMainWindow : showMainWindow },
    ...(app.dock ? [{
      label: 'Show Dock Icon',
      type: 'checkbox',
      checked: !dockIconHidden,
      click: () => {
        setDockIconHidden(!dockIconHidden);
        updatePrefs({ hideDockIcon: dockIconHidden });
        updateTrayMenu(trayTrack, trayArtist);
      },
    }] : []),
    {
      label: 'Capture Media Keys',
      type: 'checkbox',
      checked: mediaKeysEnabled,
      click: () => {
        setShortcutGroup('media', !mediaKeysEnabled, true);
        updatePrefs({ mediaKeys: mediaKeysEnabled });
      },
    },
    {
      label: 'Global Shortcuts (Cmd+Shift)',
      type: 'checkbox',
      checked: globalShortcutsEnabled,
      click: () => {
        setShortcutGroup('global', !globalShortcutsEnabled);
        updatePrefs({ globalShortcuts: globalShortcutsEnabled });
      },
    },
    ...shortcutProblemItems(),
    { type: 'separator' },
    { label: 'Quit Argon', click: () => { tray = null; app.quit(); } },
  ]);
}

// ─── Global Shortcuts ───────────────────────────────────────────────────────

const runMusic = (script) => () => runAppleScript(`tell application "Music" to ${script}`);

const SHORTCUT_GROUPS = {
  media: {
    MediaPlayPause: runMusic('playpause'),
    MediaNextTrack: runMusic('next track'),
    MediaPreviousTrack: runMusic('previous track'),
  },
  global: {
    'CommandOrControl+Shift+Up': runMusic('set sound volume to (sound volume + 5)'),
    'CommandOrControl+Shift+Down': runMusic('set sound volume to (sound volume - 5)'),
    'CommandOrControl+Shift+M': () => {
      // Closing the window destroys it, so bring it back instead of throwing
      if (!mainWindow || mainWindow.isDestroyed()) createWindow();
      else mainWindow.webContents.send('toggle-mini-mode');
    },
  },
};

const ACCESSIBILITY_SETTINGS_URL = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

// Turn one group of shortcuts on or off: unregister its accelerators, then register them if enabled.
// `prompt` lets macOS ask for Accessibility access, so it's only set when the user just turned the keys on.
function setShortcutGroup(group, enabled, prompt = false) {
  if (group === 'media') mediaKeysEnabled = enabled;
  else globalShortcutsEnabled = enabled;

  const accelerators = SHORTCUT_GROUPS[group];
  for (const accelerator of Object.keys(accelerators)) {
    globalShortcut.unregister(accelerator);
    delete shortcutProblems.failed[accelerator];
    if (enabled && !globalShortcut.register(accelerator, accelerators[accelerator])) {
      shortcutProblems.failed[accelerator] = true;
    }
  }
  if (group === 'media') {
    // Media keys only register once Argon is a trusted accessibility client
    shortcutProblems.untrusted = enabled && !systemPreferences.isTrustedAccessibilityClient(prompt);
  }
  updateTrayMenu(trayTrack, trayArtist);
}

// Tray menu lines for shortcuts that are on but not working
function shortcutProblemItems() {
  const items = [];
  if (shortcutProblems.untrusted) {
    items.push({
      label: 'Media Keys Need Accessibility Permission…',
      click: () => shell.openExternal(ACCESSIBILITY_SETTINGS_URL),
    });
  }
  const inUse = Object.keys(shortcutProblems.failed)
    .map((accelerator) => accelerator.replace('CommandOrControl', 'Cmd'));
  if (inUse.length) {
    items.push({ label: `In use by another app: ${inUse.join(', ')}`, enabled: false });
  }
  return items;
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Applied before the window is created, so the window opens with the app already in accessory mode
  if (loadPrefs().hideDockIcon === true) setDockIconHidden(true);
  createWindow();
  createTray();
  const prefs = loadPrefs();
  setShortcutGroup('media', prefs.mediaKeys === true);
  setShortcutGroup('global', prefs.globalShortcuts !== false);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit when tray exists — app lives in menu bar
  if (!tray) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
});
