// Runs the real src/js/app.js against stub DOM objects, so tests can drive its handlers.
// Every element is a catch-all stub; only what a test cares about is made real.

const fs = require('fs');
const path = require('path');

function stub(overrides = {}) {
  const cache = {};
  return new Proxy(function () {}, {
    get(_, key) {
      if (key in overrides) return overrides[key];
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === 'then') return undefined;
      if (typeof key === 'symbol') return undefined;
      return (cache[key] ||= stub());
    },
    set(_, key, value) { overrides[key] = value; return true; },
    apply() { return stub(); },
    construct() { return stub(); },
  });
}

function fakeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c); else set.delete(c);
      return on;
    },
  };
}

// themeVars: the CSS variables getComputedStyle should report
async function loadApp({ prefs = {}, themeVars = {}, innerWidth = 320, innerHeight = 520 } = {}) {
  const listeners = { document: {}, window: {}, byId: {} };
  const frames = [];
  const calls = { applyConstraints: [], prefsSave: [], fetchPlaylist: 0 };
  const savedPrefs = { ...prefs };

  const elements = {};
  const element = (sel) => (elements[sel] ||= stub({
    classList: fakeClassList(),
    addEventListener: (type, fn) => { (listeners.byId[sel] ||= {})[type] = fn; },
  }));

  const vars = { '--show-playlist': 'none', '--base-width': '320', '--window-min-width': '275',
    '--window-min-height': '520', '--window-max-width': '500', '--window-max-height': '1200', ...themeVars };

  const doc = stub({
    querySelector: element,
    querySelectorAll: () => [],
    getElementById: element,
    createElement: () => stub({ classList: fakeClassList() }),
    documentElement: stub(),
    addEventListener: (type, fn) => { listeners.document[type] = fn; },
  });

  const win = stub({
    innerWidth, innerHeight,
    addEventListener: (type, fn) => { (listeners.window[type] ||= []).push(fn); },
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    api: stub({
      prefs: stub({
        load: async () => ({ ...savedPrefs }),
        save: async (p) => { calls.prefsSave.push(p); Object.assign(savedPrefs, p); },
      }),
      window: stub({
        applyConstraints: (...args) => {
          calls.applyConstraints.push(args);
          win.innerWidth = args[4]; win.innerHeight = args[5]; // the window takes the size it was asked for
        },
      }),
      music: stub({ getPlaylist: async () => { calls.fetchPlaylist++; return []; } }),
    }),
  });

  class ThemeManager { async init() { this.currentTheme = 'test'; } }
  const globals = {
    window: win, document: doc, ThemeManager,
    getComputedStyle: () => ({ getPropertyValue: (name) => vars[name] || '' }),
    requestAnimationFrame: win.requestAnimationFrame,
    setTimeout: () => 0, setInterval: () => 0, clearTimeout: () => {}, clearInterval: () => {},
    PlaylistLayout: require('../../src/js/playlist-layout.js'),
  };
  win.PlaylistLayout = globals.PlaylistLayout;

  const proxy = new Proxy(globals, {
    has: (t, k) => k in t || !(k in globalThis),
    get: (t, k) => (typeof k === 'symbol' ? undefined : k in t ? t[k] : (k in globalThis ? globalThis[k] : stub())),
    set: (t, k, v) => { t[k] = v; return true; },
  });

  const code = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'js', 'app.js'), 'utf-8');
  const run = new Function('__g', `with (__g) { return (\n${code.trim().replace(/;$/, '')}\n); }`);
  await run(proxy);
  // let the startup awaits settle
  for (let i = 0; i < 5; i++) await Promise.resolve();

  const runFrames = () => { while (frames.length) frames.shift()(); };
  const keydown = (init) => listeners.document.keydown({ target: { tagName: 'BODY' }, preventDefault() {}, ...init });
  return {
    calls, vars, elements, listeners, savedPrefs, runFrames, keydown, win,
    player: element('#player'), plButton: element('#btn-playlist'),
    // the next resize the app asked for: { minW, minH, maxW, maxH, targetW, targetH }
    lastResize() {
      const a = calls.applyConstraints.at(-1);
      return a && { minW: a[0], minH: a[1], maxW: a[2], maxH: a[3], targetW: a[4], targetH: a[5] };
    },
  };
}

module.exports = { loadApp };
