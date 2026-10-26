// ═══════════════════════════════════════════════════════════════════════════
// Playlist Layout — window height rules for the PL button
// Pure functions, so the renderer and the tests run the same code.
// ═══════════════════════════════════════════════════════════════════════════

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlaylistLayout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // A theme that hides the playlist has no room for it, so forcing it on adds height
  const PLAYLIST_EXTRA_HEIGHT = 220;

  function resolvePlaylistVisible(themeDefault, override) {
    return typeof override === 'boolean' ? override : themeDefault;
  }

  // Window min and target height for the current playlist state.
  //   curH       current window height
  //   restoreH   height saved when the playlist was forced on (null if none)
  //   keepSize   true for a toggle (keep the user's size), false after a theme load (start from the theme's base)
  // Returns the heights to apply and the restoreH to keep for next time.
  function playlistWindowHeights({ minH, maxH, curH, themeDefault, visible, restoreH, keepSize }) {
    const forcedOn = visible && !themeDefault;
    if (forcedOn) {
      const minHeight = Math.min(minH + PLAYLIST_EXTRA_HEIGHT, maxH);
      const from = keepSize ? curH : minH;
      return {
        minHeight,
        // Grow only as far as the playlist needs, never shrink a window the user made taller
        targetHeight: Math.min(Math.max(from, minHeight), maxH),
        // Keep the height from before the playlist opened; a fresh theme load starts from its base height
        restoreH: keepSize && typeof restoreH === 'number' ? restoreH : from,
      };
    }
    const back = keepSize ? (typeof restoreH === 'number' ? restoreH : curH) : minH;
    return {
      minHeight: minH,
      targetHeight: Math.min(Math.max(back, minH), maxH),
      restoreH: null,
    };
  }

  return { PLAYLIST_EXTRA_HEIGHT, resolvePlaylistVisible, playlistWindowHeights };
});
