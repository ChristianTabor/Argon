/**
 * Tests for theme hover preview (theme-manager.js).
 * Loads the class against small DOM mocks, with fake timers.
 */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'theme-manager.js'), 'utf-8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');

const THEMES = {
  alpha: ':root {\n  --accent: #111111;\n  --base-width: 320;\n  --window-min-width: 275;\n}\n.titlebar { display: none; }',
  beta: ':root {\n  --accent: #222222;\n  --window-max-height: 900;\n}\n.playlist-container { order: -1; }',
  // Layout variables live next to the colors, like Sakura and Terminal Green
  layout: ':root {\n  --bg-primary: #101010;\n  --text-primary: #fafafa;\n  --accent-glow: rgba(1, 2, 3, 0.4);\n  --viz-color-1: #ff0000;\n  --border-accent: rgba(255, 0, 0, 0.2);\n  --artwork-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);\n  --order-titlebar: 0;\n  --order-display: 2;\n  --show-display: none;\n  --show-track-info: flex;\n  --font-ui: Helvetica;\n  --fs-time: 12px;\n  --radius: 8px;\n  --display-padding: 9px;\n  --controls-volume-layout: row;\n  --ctrl-playpause-icon: 18px;\n  --titlebar-height: 30px;\n}\n:root {\n  --order-seek: 5;\n  --logo-color: #00ff00;\n}',
  gamma: ':root {\n  --accent: #333333;\n}',
};

function fakeElement() {
  const listeners = {};
  const el = {
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    children: [],
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    appendChild(child) { el.children.push(child); },
    querySelectorAll: () => [],
    after(sibling) { el.sibling = sibling; },
    listeners,
  };
  return el;
}

function setup() {
  const win = {};
  const docListeners = {};
  const events = [];
  const els = {};
  const document = {
    getElementById: (id) => (els[id] = els[id] || fakeElement()),
    createElement: () => fakeElement(),
    addEventListener: (type, fn) => { docListeners[type] = fn; },
  };
  const api = {
    prefs: { load: jest.fn(async () => ({})), save: jest.fn(async () => {}) },
    window: { applyConstraints: jest.fn() },
    themes: {
      list: jest.fn(async () => Object.keys(THEMES).map((id) => ({ id, name: id, category: 'Classic' }))),
      load: jest.fn(async (id) => (THEMES[id] ? { css: THEMES[id], meta: { id } } : null)),
    },
  };
  const winListeners = {};
  win.addEventListener = (type, fn) => { winListeners[type] = fn; };
  win.dispatchEvent = (e) => { events.push(e); };
  win.api = api;
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }

  const ThemeManager = new Function(
    'window', 'document', 'CustomEvent',
    `${source}; return ThemeManager;`
  )(win, document, CustomEvent);
  const tm = new ThemeManager();
  return { tm, api, els, events, winListeners, docListeners };
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const previewEvents = (t) => t.events.filter((e) => e.type === 'themepreview').map((e) => e.detail.themeId);

describe('Theme hover preview', () => {
  let t;
  beforeEach(async () => {
    jest.useFakeTimers();
    t = setup();
    t.els['theme-styles'].textContent = 'COMMITTED';
    t.tm.currentTheme = 'alpha';
    await t.tm.loadThemeList();
    t.tm.renderThemeList();
  });
  afterEach(() => jest.useRealTimers());

  const card = (id) => t.els['theme-list'].children.find((c) => c.dataset.id === id);

  test('preview goes in its own style element and leaves the committed CSS alone', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    expect(t.els['theme-styles'].textContent).toBe('COMMITTED');
    expect(t.tm.previewEl.textContent).toContain('--accent: #222222');
    expect(t.tm.styleEl.sibling).toBe(t.tm.previewEl);
  });

  test('preview keeps only the color variables', async () => {
    t.tm.currentTheme = 'gamma';
    await t.tm.previewTheme('alpha');
    expect(t.tm.previewEl.textContent).toContain('--accent: #111111');
    expect(t.tm.previewEl.textContent).not.toContain('--base-width');
    expect(t.tm.previewEl.textContent).not.toContain('--window-min-width');
    expect(t.tm.previewEl.textContent).not.toContain('titlebar');
    await t.tm.previewTheme('beta');
    expect(t.tm.previewEl.textContent).not.toContain('--window-max-height');
    expect(t.tm.previewEl.textContent).not.toContain('playlist');
  });

  test('preview drops layout variables and keeps the colors', async () => {
    t.tm.currentTheme = 'gamma';
    await t.tm.previewTheme('layout');
    const css = t.tm.previewEl.textContent;
    for (const kept of ['--bg-primary: #101010', '--text-primary: #fafafa', '--accent-glow: rgba(1, 2, 3, 0.4)',
      '--viz-color-1: #ff0000', '--border-accent: rgba(255, 0, 0, 0.2)', '--artwork-shadow: 0 4px 24px rgba(0, 0, 0, 0.4)',
      '--logo-color: #00ff00']) {
      expect(css).toContain(kept);
    }
    for (const dropped of ['--order-', '--show-', '--font-', '--fs-', '--radius', 'padding', '--controls-volume-layout',
      '--ctrl-playpause-icon', '--titlebar-height']) {
      expect(css).not.toContain(dropped);
    }
  });

  test('preview never resizes the window, saves prefs, or fires themechange', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.cancelPreview();
    expect(t.api.window.applyConstraints).not.toHaveBeenCalled();
    expect(t.api.prefs.save).not.toHaveBeenCalled();
    expect(t.events.map((e) => e.type)).not.toContain('themechange');
  });

  test('nothing previews before the 150 ms delay', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(149);
    await flush();
    expect(t.tm.previewEl.textContent).toBe('');
    expect(t.api.themes.load).not.toHaveBeenCalled();
  });

  test('cancel restores the exact previous state and says so', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.cancelPreview();
    expect(t.tm.previewEl.textContent).toBe('');
    expect(t.els['theme-styles'].textContent).toBe('COMMITTED');
    expect(previewEvents(t)).toEqual(['beta', null]);
  });

  test('cancel with nothing previewed does nothing', () => {
    t.tm.cancelPreview();
    expect(previewEvents(t)).toEqual([]);
  });

  test('a fast sweep across cards only previews the last one', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(100);
    t.tm.schedulePreview('gamma');
    jest.advanceTimersByTime(100);
    expect(t.api.themes.load).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    await flush();
    expect(t.api.themes.load).toHaveBeenCalledTimes(1);
    expect(t.tm.previewEl.textContent).toContain('#333333');
  });

  test('moving card to card does not flash the committed theme in between', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.scheduleCancel(); // mouseleave
    jest.advanceTimersByTime(20);
    t.tm.schedulePreview('gamma'); // mouseenter on the next card
    jest.advanceTimersByTime(40);
    expect(t.tm.previewEl.textContent).toContain('#222222'); // still the old preview, not committed
    jest.advanceTimersByTime(150);
    await flush();
    expect(t.tm.previewEl.textContent).toContain('#333333');
    expect(previewEvents(t)).not.toContain(null);
  });

  test('leaving for empty space reverts after a short pause', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.scheduleCancel();
    jest.advanceTimersByTime(60);
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('a slow load that finishes after the pointer left does not apply', async () => {
    let release;
    t.api.themes.load.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    t.tm.scheduleCancel();
    jest.advanceTimersByTime(60);
    release({ css: THEMES.beta, meta: {} });
    await flush();
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('hovering the committed theme shows the committed theme', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.schedulePreview('alpha');
    jest.advanceTimersByTime(150);
    await flush();
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('each theme is read from disk once per panel open, hover and click together', async () => {
    t.tm.toggle(); // open: clears the cache
    await flush();
    t.tm.currentTheme = 'alpha';
    for (const id of ['beta', 'gamma', 'beta']) {
      t.tm.schedulePreview(id);
      jest.advanceTimersByTime(150);
      await flush();
    }
    await t.tm.applyTheme('beta');
    expect(t.api.themes.load.mock.calls.filter(([id]) => id === 'beta')).toHaveLength(1);
    expect(t.api.themes.load.mock.calls.filter(([id]) => id === 'gamma')).toHaveLength(1);
  });

  test('reopening the panel reads from disk again', async () => {
    await t.tm.previewTheme('beta');
    t.tm.toggle();
    await flush();
    await t.tm.previewTheme('beta');
    expect(t.api.themes.load).toHaveBeenCalledTimes(2);
  });

  test('click commits once: saves the pref, fires themechange, clears the preview', async () => {
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    await t.tm.applyTheme('beta');
    expect(t.api.prefs.save).toHaveBeenCalledTimes(1);
    expect(t.api.prefs.save.mock.calls[0][0].theme).toBe('beta');
    // The app resizes the window when it hears themechange, so the theme manager doesn't resize itself
    expect(t.api.window.applyConstraints).not.toHaveBeenCalled();
    expect(t.events.filter((e) => e.type === 'themechange')).toHaveLength(1);
    expect(t.tm.previewEl.textContent).toBe('');
    expect(t.els['theme-styles'].textContent).toBe(THEMES.beta);
  });

  test('a click during the hover delay stops the pending preview', async () => {
    t.tm.schedulePreview('gamma');
    await t.tm.applyTheme('beta');
    jest.advanceTimersByTime(300);
    await flush();
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('closing the panel cancels the preview', async () => {
    t.tm.toggle();
    await flush();
    t.tm.schedulePreview('beta');
    jest.advanceTimersByTime(150);
    await flush();
    t.tm.close();
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('Escape and window blur cancel the preview', async () => {
    t.tm.isOpen = true;
    await t.tm.previewTheme('beta');
    t.docListeners.keydown({ key: 'Escape' });
    expect(t.tm.previewEl.textContent).toBe('');
    await t.tm.previewTheme('beta');
    t.winListeners.blur();
    expect(t.tm.previewEl.textContent).toBe('');
  });

  test('adaptive card announces an adaptive preview and commits as before', async () => {
    t.tm.schedulePreview('_adaptive');
    jest.advanceTimersByTime(150);
    await flush();
    expect(t.events.filter((e) => e.type === 'themepreview')[0].detail.adaptive).toBe(true);
    expect(t.api.themes.load).not.toHaveBeenCalled();
    t.tm.cancelPreview();
    expect(previewEvents(t)).toEqual(['_adaptive', null]);
    await t.tm.applyTheme('_adaptive');
    expect(t.api.prefs.save.mock.calls[0][0].theme).toBe('_adaptive');
  });

  describe('card wiring', () => {
    test('cards are focusable and preview on hover and focus', async () => {
      const c = card('beta');
      expect(c.tabIndex).toBe(0);
      c.listeners.mouseenter();
      jest.advanceTimersByTime(150);
      await flush();
      expect(t.tm.previewEl.textContent).toContain('#222222');
      c.listeners.mouseleave();
      jest.advanceTimersByTime(60);
      expect(t.tm.previewEl.textContent).toBe('');
      card('gamma').listeners.focus();
      jest.advanceTimersByTime(150);
      await flush();
      expect(t.tm.previewEl.textContent).toContain('#333333');
      card('gamma').listeners.blur();
      jest.advanceTimersByTime(60);
      expect(t.tm.previewEl.textContent).toBe('');
    });

    test('Enter commits, other keys do not', async () => {
      card('beta').listeners.keydown({ key: 'a' });
      await flush();
      expect(t.api.prefs.save).not.toHaveBeenCalled();
      card('beta').listeners.keydown({ key: 'Enter' });
      await flush();
      expect(t.api.prefs.save).toHaveBeenCalledTimes(1);
    });

    test('click commits', async () => {
      card('gamma').listeners.click();
      await flush();
      expect(t.api.prefs.save.mock.calls[0][0].theme).toBe('gamma');
    });
  });
});

// Pull a function out of app.js by name so the real code runs against mocks
function extractFunction(name) {
  const start = appCode.indexOf(`function ${name}(`);
  let i = appCode.indexOf('{', start);
  let depth = 0;
  for (; i < appCode.length; i++) {
    if (appCode[i] === '{') depth++;
    else if (appCode[i] === '}' && --depth === 0) break;
  }
  return appCode.slice(start, i + 1);
}

describe('reapplyOverrides during a preview', () => {
  function build({ opacity, vars }) {
    const writes = [];
    const transparencyStyleEl = {
      _text: '',
      get textContent() { return this._text; },
      set textContent(v) { this._text = v; writes.push(v); },
    };
    const rafCalls = [];
    const env = {
      transparencyStyleEl,
      bgOpacity: opacity,
      originalBgColors: {},
      darkTextMode: false,
      document: { documentElement: { offsetHeight: 0 } },
      getComputedStyle: () => ({ getPropertyValue: (n) => vars[n] || '' }),
      requestAnimationFrame: (fn) => { rafCalls.push(fn); },
      window: { api: { window: { setVibrancy: jest.fn() } } },
      applyDarkTextMode: jest.fn(),
    };
    const body = ['parseColor', 'cacheBgColors', 'applyBgTransparency', 'reapplyOverrides']
      .map(extractFunction).join('\n');
    // bgOpacity/originalBgColors are `let`s in app.js: expose them through accessors
    const fn = new Function('env', `
      const { transparencyStyleEl, document, getComputedStyle, requestAnimationFrame, window, applyDarkTextMode } = env;
      let bgOpacity = env.bgOpacity; let originalBgColors = {}; let darkTextMode = env.darkTextMode;
      ${body}
      return { reapplyOverrides, applyBgTransparency };
    `);
    return { ...fn(env), writes, rafCalls, el: transparencyStyleEl };
  }

  const VARS = { '--bg-primary': '#102030', '--bg-secondary': 'rgb(1, 2, 3)', '--titlebar-bg': 'rgba(4, 5, 6, 0.5)' };

  test('below 100% the opacity override is rewritten in the same turn, with no frame in between', () => {
    const t = build({ opacity: 0.6, vars: VARS });
    t.applyBgTransparency(0.6);
    t.reapplyOverrides(); // what themepreview does when a preview starts or is cancelled
    expect(t.rafCalls).toHaveLength(0);
    expect(t.el.textContent).toContain('--bg-primary: rgba(16, 32, 48, 0.6) !important');
    expect(t.el.textContent).toContain('--titlebar-bg: rgba(4, 5, 6, 0.3) !important');
    // The last write leaves the override on, so no paint can see it cleared
    expect(t.writes[t.writes.length - 1]).not.toBe('');
  });

  test('at 100% a preview leaves no override', () => {
    const t = build({ opacity: 1, vars: VARS });
    t.reapplyOverrides();
    expect(t.el.textContent).toBe('');
  });
});

describe('Theme preview wiring in app.js', () => {
  test('re-applies transparency and dark text for previews and after cancel', () => {
    expect(appCode).toContain("window.addEventListener('themepreview'");
    expect(appCode).toContain('function reapplyOverrides()');
    expect(extractFunction('reapplyOverrides')).not.toContain('requestAnimationFrame');
  });

  test('builds adaptive preview colors from the artwork without touching committed styles', () => {
    expect(appCode).toContain("getElementById('theme-preview-styles').textContent = applyAdaptiveColors(colors)");
  });
});
