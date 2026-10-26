// ═══════════════════════════════════════════════════════════════════════════
// Favorite — heart state for the current track, kept separate so it can be tested
// ═══════════════════════════════════════════════════════════════════════════

// `toggle(id)` asks Music to flip the favorite and resolves to true/false (or 'stale').
// `paint(favorited)` draws the heart.
function createFavoriteController({ toggle, paint }) {
  let id = '';
  let favorited = false;
  let pending = false;

  function show(value) {
    favorited = value;
    paint(value);
  }

  return {
    get id() { return id; },
    get favorited() { return favorited; },

    // Called with every poll. While a toggle is in flight the heart is frozen,
    // unless the track changed: then it follows the new track straight away.
    update(newId, polledFavorited) {
      const changed = newId !== id;
      id = newId;
      if (!pending || changed) show(!!polledFavorited);
    },

    // Updates optimistically, then rolls back if the call fails or Music says the track changed.
    // The result only applies if the track is still the one that was sent.
    async click() {
      const sent = id;
      if (!sent || pending) return;
      pending = true;
      const previous = favorited;
      show(!previous);
      try {
        const result = await toggle(sent);
        if (id === sent) show(typeof result === 'boolean' ? result : previous);
      } catch (e) {
        if (id === sent) show(previous);
      }
      pending = false;
    },
  };
}

// F toggles it, but not on key repeat or with Cmd/Ctrl/Alt held
function isFavoriteKey(e) {
  return e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey;
}

if (typeof module !== 'undefined') module.exports = { createFavoriteController, isFavoriteKey };
