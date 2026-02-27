const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Music controls
  music: {
    getState: () => ipcRenderer.invoke('music:getState'),
    getArtwork: () => ipcRenderer.invoke('music:getArtwork'),
    play: () => ipcRenderer.invoke('music:play'),
    pause: () => ipcRenderer.invoke('music:pause'),
    playpause: () => ipcRenderer.invoke('music:playpause'),
    next: () => ipcRenderer.invoke('music:next'),
    prev: () => ipcRenderer.invoke('music:prev'),
    setVolume: (vol) => ipcRenderer.invoke('music:setVolume', vol),
    setPosition: (pos) => ipcRenderer.invoke('music:setPosition', pos),
    toggleShuffle: () => ipcRenderer.invoke('music:toggleShuffle'),
    toggleRepeat: () => ipcRenderer.invoke('music:toggleRepeat'),
    getPlaylist: () => ipcRenderer.invoke('music:getPlaylist'),
    playTrackIndex: (index) => ipcRenderer.invoke('music:playTrackIndex', index),
    getLyrics: () => ipcRenderer.invoke('music:getLyrics'),
  },

  // Theme management
  themes: {
    list: () => ipcRenderer.invoke('themes:list'),
    load: (id) => ipcRenderer.invoke('themes:load', id),
    install: () => ipcRenderer.invoke('themes:install'),
    openFolder: () => ipcRenderer.invoke('themes:openFolder'),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleOnTop: () => ipcRenderer.invoke('window:toggleOnTop'),
    snapBottomRight: () => ipcRenderer.invoke('window:snapBottomRight'),
    setMinMaxSize: (minW, minH, maxW, maxH) => ipcRenderer.invoke('window:setMinMaxSize', minW, minH, maxW, maxH),
    resize: (w, h) => ipcRenderer.invoke('window:resize', w, h),
    applyConstraints: (minW, minH, maxW, maxH, targetW, targetH) => ipcRenderer.invoke('window:applyConstraints', minW, minH, maxW, maxH, targetW, targetH),
    toggleLock: () => ipcRenderer.invoke('window:toggleLock'),
    setVibrancy: (v) => ipcRenderer.invoke('window:setVibrancy', v),
  },

  // Notifications
  notifications: {
    trackChange: (track, artist, album) => ipcRenderer.invoke('notify:trackChange', track, artist, album),
  },

  // Tray
  tray: {
    updateTrack: (track, artist) => ipcRenderer.invoke('tray:updateTrack', track, artist),
  },

  // Preferences
  prefs: {
    load: () => ipcRenderer.invoke('prefs:load'),
    save: (prefs) => ipcRenderer.invoke('prefs:save', prefs),
  },

  // IPC event listeners (main → renderer)
  onToggleMiniMode: (callback) => ipcRenderer.on('toggle-mini-mode', () => callback()),
});
