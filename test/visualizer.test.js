/**
 * Tests for the visualizer's playback-state behavior.
 * Loads src/js/visualizer.js against small DOM mocks, with a manual frame queue.
 */

const fs = require('fs');
const path = require('path');

const vizSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'visualizer.js'), 'utf-8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'app.js'), 'utf-8');

function setup({ hidden = false, reducedMotion = false } = {}) {
  const listeners = { window: {}, document: {}, media: {} };
  const frames = [];
  let nextId = 1;
  const env = {
    now: 1000,
    vars: { '--viz-color-1': ' red ', '--viz-color-2': 'green', '--viz-color-3': 'blue' },
    computedStyleCalls: 0,
    drawCalls: 0,
  };

  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'fillRect' || prop === 'stroke') return () => { env.drawCalls++; };
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const canvas = {
    getContext: () => ctx,
    parentElement: { getBoundingClientRect: () => ({ width: 100, height: 40 }) },
  };

  const doc = {
    visibilityState: hidden ? 'hidden' : 'visible',
    documentElement: {},
    head: {},
    addEventListener: (type, fn) => { listeners.document[type] = fn; },
  };
  const win = {
    devicePixelRatio: 1,
    addEventListener: (type, fn) => { listeners.window[type] = fn; },
    matchMedia: () => ({
      matches: reducedMotion,
      addEventListener: (type, fn) => { listeners.media[type] = fn; },
    }),
  };
  const getComputedStyle = () => {
    env.computedStyleCalls++;
    return { getPropertyValue: (name) => env.vars[name] || '' };
  };

  const jestNow = jest.spyOn(Date, 'now').mockImplementation(() => env.now);
  const raf = (fn) => { const id = nextId++; frames.push({ id, fn }); return id; };
  const caf = (id) => {
    const i = frames.findIndex((f) => f.id === id);
    if (i >= 0) frames.splice(i, 1);
  };

  const load = new Function(
    'window', 'document', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    `${vizSource}; return Visualizer;`
  );
  const Visualizer = load(win, doc, getComputedStyle, raf, caf, undefined);
  const viz = new Visualizer(canvas);

  // Run queued frames at 60 fps; returns how many ran
  function run(count) {
    let ran = 0;
    for (let i = 0; i < count && frames.length; i++) {
      const { fn } = frames.shift();
      env.now += 16;
      fn();
      ran++;
    }
    return ran;
  }

  return { viz, env, frames, listeners, doc, run, restore: () => jestNow.mockRestore() };
}

describe('Visualizer playback state', () => {
  let t;
  afterEach(() => { if (t) t.restore(); });

  test('animates while playing and keeps asking for frames', () => {
    t = setup();
    t.viz.setState('playing');
    expect(t.run(60)).toBe(60);
    expect(t.frames.length).toBe(1);
    expect(Math.max(...t.viz.bars)).toBeGreaterThan(0.1);
  });

  test('stopped from the start idles after the first frame', () => {
    t = setup();
    expect(t.run(10)).toBe(1);
    expect(t.frames.length).toBe(0);
  });

  test('pause settles to flat within about 300 ms, then the loop stops', () => {
    t = setup();
    t.viz.setState('playing');
    t.run(60);
    t.viz.setState('paused');
    const ran = t.run(100);
    expect(ran).toBeLessThanOrEqual(25); // ~400 ms at 16 ms a frame
    expect(t.frames.length).toBe(0);
    expect(t.viz.bars.every((b) => b === 0)).toBe(true);
  });

  test('stop settles and idles the same way', () => {
    t = setup();
    t.viz.setState('playing');
    t.run(30);
    t.viz.setState('stopped');
    t.run(100);
    expect(t.frames.length).toBe(0);
    expect(t.viz.bars.every((b) => b === 0)).toBe(true);
  });

  test('resuming restarts the loop right away', () => {
    t = setup();
    t.viz.setState('playing');
    t.run(10);
    t.viz.setState('paused');
    t.run(100);
    expect(t.frames.length).toBe(0);
    t.viz.setState('playing');
    expect(t.frames.length).toBe(1);
  });

  test('setting the same state again does not queue extra frames', () => {
    t = setup();
    t.viz.setState('playing');
    t.viz.setState('playing');
    expect(t.frames.length).toBe(1);
  });

  test('seeking animates and flutters', () => {
    t = setup();
    t.viz.setState('seeking');
    t.run(30);
    expect(t.frames.length).toBe(1);
    expect(Math.max(...t.viz.bars)).toBeLessThanOrEqual(0.5);
    expect(Math.max(...t.viz.bars)).toBeGreaterThan(0);
  });

  test('a track change drops the bars for a short gap, then the music returns', () => {
    t = setup();
    t.viz.setState('playing');
    t.run(60);
    const before = Math.max(...t.viz.bars);
    t.viz.trackChanged();
    t.run(8); // ~130 ms
    expect(Math.max(...t.viz.bars)).toBeLessThan(before * 0.3);
    t.run(60);
    expect(Math.max(...t.viz.bars)).toBeGreaterThan(0.1);
  });

  test('a track change while paused does not keep the loop alive', () => {
    t = setup();
    t.viz.setState('paused');
    t.viz.trackChanged();
    t.run(30);
    expect(t.frames.length).toBe(0);
  });
});

describe('Visualizer redraw triggers while idle', () => {
  let t;
  afterEach(() => { if (t) t.restore(); });

  function idle() {
    t = setup();
    t.run(5);
    expect(t.frames.length).toBe(0);
  }

  test('mode change draws once more', () => {
    idle();
    t.viz.nextMode();
    expect(t.run(5)).toBe(1);
    t.viz.setMode('spectrum');
    expect(t.run(5)).toBe(1);
  });

  test('resize redraws', () => {
    idle();
    t.listeners.window.resize();
    expect(t.run(5)).toBe(1);
  });

  test('themechange redraws with the new colors', () => {
    idle();
    t.env.vars['--viz-color-1'] = 'purple';
    t.listeners.window.themechange();
    expect(t.viz.colors.color1).toBe('purple');
    expect(t.run(5)).toBe(1);
  });
});

describe('Visualizer color cache', () => {
  let t;
  afterEach(() => { if (t) t.restore(); });

  test('reads computed style once, not every frame', () => {
    t = setup();
    t.viz.setState('playing');
    const calls = t.env.computedStyleCalls;
    t.run(120);
    expect(t.env.computedStyleCalls).toBe(calls);
  });

  test('trims values and falls back to defaults', () => {
    t = setup();
    expect(t.viz.colors.color1).toBe('red');
    t.env.vars = {};
    t.viz.refreshColors();
    expect(t.viz.colors.color1).toBe('#00ff41');
  });
});

describe('Visualizer visibility', () => {
  let t;
  afterEach(() => { if (t) t.restore(); });

  test('does not run while the window is hidden', () => {
    t = setup({ hidden: true });
    t.viz.setState('playing');
    expect(t.frames.length).toBe(0);
  });

  test('hiding cancels the loop and showing resumes it', () => {
    t = setup();
    t.viz.setState('playing');
    expect(t.frames.length).toBe(1);
    t.doc.visibilityState = 'hidden';
    t.listeners.document.visibilitychange();
    expect(t.frames.length).toBe(0);
    t.doc.visibilityState = 'visible';
    t.listeners.document.visibilitychange();
    expect(t.frames.length).toBe(1);
  });
});

describe('Visualizer reduced motion', () => {
  let t;
  afterEach(() => { if (t) t.restore(); });

  test('draws one static low-energy frame while playing', () => {
    t = setup({ reducedMotion: true });
    t.viz.setState('playing');
    expect(t.run(10)).toBe(1);
    expect(t.frames.length).toBe(0);
    const peak = Math.max(...t.viz.bars);
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(0.4);
  });

  test('pause goes flat in a single frame', () => {
    t = setup({ reducedMotion: true });
    t.viz.setState('playing');
    t.run(2);
    t.viz.setState('paused');
    t.run(2);
    expect(t.viz.bars.every((b) => b === 0)).toBe(true);
  });

  test('toggling the OS setting while running takes effect', () => {
    t = setup();
    t.viz.setState('playing');
    t.run(5);
    t.listeners.media.change({ matches: true });
    t.run(5);
    expect(t.frames.length).toBe(0);
  });
});

describe('Visualizer wiring in app.js', () => {
  test('passes the full player state, mapping fast forwarding and rewinding to seeking', () => {
    expect(appCode).toContain("'fast forwarding': 'seeking'");
    expect(appCode).toContain('rewinding: \'seeking\'');
    expect(appCode).toContain('viz.setState(');
    expect(appCode).not.toContain('viz.setPlaying');
  });

  test('tells the visualizer about track changes', () => {
    expect(appCode).toContain('viz.trackChanged()');
  });

  test('saves and restores the visualizer mode', () => {
    expect(appCode).toContain('prefs.visualizer = mode');
    expect(appCode).toContain('viz.setMode(p.visualizer)');
  });

  test('button and V key both go through the persisting cycle function', () => {
    expect(appCode).toContain("vizModeToggle.addEventListener('click', cycleVizMode)");
    expect(appCode).toMatch(/case\s*'KeyV':\s*cycleVizMode\(\)/);
    expect(appCode).not.toContain('viz.nextMode(); break');
  });
});
