/**
 * @jest-environment jsdom
 */

function mount() {
  document.body.innerHTML = `
    <style id="theme-styles"></style>
    <div id="theme-panel"></div>
    <div id="theme-tabs"></div>
    <div id="theme-list"></div>
  `;
}

function createApi(themes) {
  const prefs = { theme: '' };
  return {
    themes,
    prefs: {
      load: jest.fn(async () => ({ ...prefs })),
      save: jest.fn(async (next) => Object.assign(prefs, next)),
    },
    window: { applyConstraints: jest.fn() },
  };
}

describe('ThemeManager', () => {
  beforeEach(() => {
    mount();
    require('../src/js/theme-manager.js');
  });

  test('getCategories puts known categories first and keeps extras after them', () => {
    window.api = createApi([]);
    const manager = new window.ThemeManager();
    manager.themes = [
      { category: 'Vibes' },
      { category: 'Extra' },
      { category: 'Classic' },
      { category: 'Modern' },
      { category: 'Vibes' },
    ];
    expect(manager.getCategories()).toEqual(['All', 'Classic', 'Modern', 'Vibes', 'Extra']);
  });

  test('hides tabs when there is only one real category', () => {
    window.api = createApi([]);
    const manager = new window.ThemeManager();
    manager.themes = [{ id: 'a', category: 'Classic', name: 'A' }];
    manager.renderTabs();
    expect(document.getElementById('theme-tabs').style.display).toBe('none');
    expect(document.getElementById('theme-tabs').children.length).toBe(0);
  });

  test('tab click filters the list to that category', () => {
    window.api = createApi([]);
    const manager = new window.ThemeManager();
    manager.themes = [
      { id: 'classic', category: 'Classic', name: 'Classic One', author: 'Argon' },
      { id: 'modern', category: 'Modern', name: 'Modern One', author: 'Argon' },
      { id: 'vibes', category: 'Vibes', name: 'Vibes One', author: 'Argon' },
    ];
    manager.renderTabs();
    const tabs = [...document.querySelectorAll('.theme-tab')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['All', 'Classic', 'Modern', 'Vibes']);
    tabs.find((tab) => tab.textContent === 'Modern').click();
    const names = [...document.querySelectorAll('.theme-card-name')].map((el) => el.textContent);
    expect(names).toEqual(['Modern One']);
  });

  test('renderThemeList escapes names and authors and sanitizes preview colors', () => {
    window.api = createApi([]);
    const manager = new window.ThemeManager();
    manager.themes = [{
      id: 'evil',
      category: 'Classic',
      name: '<script>alert(1)</script>',
      author: '"><img src=x onerror=alert(1)>',
      preview: ['red', '#abc', 'blue;color:url(javascript:alert(1))', 'rgb(1,2,3)'],
    }];
    manager.renderThemeList();
    const list = document.getElementById('theme-list');
    expect(list.querySelector('script')).toBeNull();
    expect(list.querySelector('img')).toBeNull();
    expect(list.textContent).toContain('<script>alert(1)</script>');
    expect(list.textContent).toContain('"><img src=x onerror=alert(1)>');
    const swatches = [...list.querySelectorAll('.theme-card-swatch')].map((el) => el.getAttribute('style'));
    expect(swatches).toEqual([
      'background:red',
      'background:#abc',
      'background:#111',
      'background:#111',
    ]);
  });

  test('applyTheme writes the theme CSS, saves, and dispatches themechange; app.js does the resize', async () => {
    const api = createApi([]);
    window.api = api;
    api.themes.load = jest.fn(async () => ({
      css: ':root { --base-width: 320; --window-min-width: 280; --window-min-height: 400; --window-max-width: 900; --window-max-height: 1000; }',
      meta: { name: 'Wide' },
    }));
    const manager = new window.ThemeManager();
    manager.themes = [{ id: 'wide', name: 'Wide' }];
    manager.renderThemeList();
    const event = jest.fn();
    window.addEventListener('themechange', event);

    const ok = await manager.applyTheme('wide');

    expect(ok).toBe(true);
    expect(document.getElementById('theme-styles').textContent).toContain('--base-width: 320');
    // The themechange listener in app.js resizes the window (see renderer-behavior.test.js)
    expect(api.window.applyConstraints).not.toHaveBeenCalled();
    expect(api.prefs.save).toHaveBeenCalledWith(expect.objectContaining({ theme: 'wide' }));
    expect(event).toHaveBeenCalledWith(expect.objectContaining({
      detail: { themeId: 'wide', meta: { name: 'Wide' }, adaptive: false },
    }));
    expect(document.querySelector('.theme-card[data-id="wide"]').classList.contains('active')).toBe(true);
  });

  test('the adaptive theme saves, marks the card, and dispatches themechange without loading CSS', async () => {
    const api = createApi([]);
    window.api = api;
    const manager = new window.ThemeManager();
    manager.renderThemeList();
    const event = jest.fn();
    window.addEventListener('themechange', event);

    const ok = await manager.applyTheme('_adaptive');

    expect(ok).toBe(true);
    expect(api.themes.load).toBeUndefined();
    expect(api.prefs.save).toHaveBeenCalledWith(expect.objectContaining({ theme: '_adaptive' }));
    expect(event.mock.calls[0][0].detail).toEqual({ themeId: '_adaptive', adaptive: true });
    expect(document.querySelector('.theme-card[data-id="_adaptive"]').classList.contains('active')).toBe(true);
  });

  test('applyTheme returns false when the theme cannot be loaded', async () => {
    window.api = createApi([]);
    window.api.themes.load = jest.fn(async () => null);
    const manager = new window.ThemeManager();
    expect(await manager.applyTheme('missing')).toBe(false);
  });
});
