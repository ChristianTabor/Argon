// ═══════════════════════════════════════════════════════════════════════════
// Theme Manager — Load, switch, and manage themes with category tabs
// ═══════════════════════════════════════════════════════════════════════════

// Color-only custom properties a hover preview may apply
const PREVIEW_COLOR_VARS = /^--(?:bg-[\w-]+|text-[\w-]+|accent(?:-[\w-]+)?|border(?:-accent)?|viz-(?:bg|color-\d+)|titlebar-(?:bg|text)|panel-bg|logo-(?:accent-)?color|ctrl-(?:bg|hover|active)|bar-(?:bg|fill|handle)|glow|shadow|artwork-(?:border|shadow))$/;

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themes = [];
    this.styleEl = document.getElementById('theme-styles');
    this.listEl = document.getElementById('theme-list');
    this.panelEl = document.getElementById('theme-panel');
    this.tabsEl = document.getElementById('theme-tabs');
    this.isOpen = false;
    this.activeCategory = 'All';

    // Previews go in their own <style> right after the committed one, so cancelling
    // is just emptying it. The committed CSS (and adaptive colors) are never touched.
    this.previewEl = document.createElement('style');
    this.previewEl.id = 'theme-preview-styles';
    this.styleEl.after(this.previewEl);
    this.previewTimer = null;
    this.previewSeq = 0;
    this.previewing = false;
    this.themeCache = new Map(); // theme id -> { css, meta }, cleared each time the panel opens

    window.addEventListener('blur', () => this.cancelPreview());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.cancelPreview();
    });
  }

  async init() {
    await this.loadThemeList();
    this.renderTabs();
    this.renderThemeList();

    // Load saved theme preference
    const prefs = await window.api.prefs.load();
    if (prefs.theme) {
      await this.applyTheme(prefs.theme);
    }
  }

  async loadThemeList() {
    this.themes = await window.api.themes.list();
  }

  getCategories() {
    const cats = new Set();
    for (const t of this.themes) {
      if (t.category) cats.add(t.category);
    }
    // Fixed order: All, then known categories, then any extras
    const order = ['Classic', 'Modern', 'Vibes'];
    const sorted = order.filter(c => cats.has(c));
    for (const c of cats) {
      if (!sorted.includes(c)) sorted.push(c);
    }
    return ['All', ...sorted];
  }

  renderTabs() {
    if (!this.tabsEl) return;
    this.tabsEl.innerHTML = '';
    const categories = this.getCategories();

    // Don't show tabs if there are <= 2 categories (All + 1)
    if (categories.length <= 2) {
      this.tabsEl.style.display = 'none';
      return;
    }
    this.tabsEl.style.display = '';

    for (const cat of categories) {
      const tab = document.createElement('button');
      tab.className = 'theme-tab' + (this.activeCategory === cat ? ' active' : '');
      tab.textContent = cat;
      tab.addEventListener('click', () => {
        this.activeCategory = cat;
        this.renderTabs();
        this.renderThemeList();
      });
      this.tabsEl.appendChild(tab);
    }
  }

  // Theme CSS is read from disk once per panel open; hovering and clicking share the cache
  async loadThemeData(themeId) {
    if (!this.themeCache.has(themeId)) {
      const data = await window.api.themes.load(themeId);
      if (!data) return null;
      this.themeCache.set(themeId, data);
    }
    return this.themeCache.get(themeId);
  }

  // Keep only the color custom properties from the :root blocks. Layout lives in variables
  // too (--order-*, --show-*, sizes, fonts), so an allowlist keeps the player from jumping.
  colorsOnly(css) {
    const blocks = css.match(/:root\s*\{[^}]*\}/g) || [];
    const decls = [];
    for (const block of blocks) {
      const body = block.slice(block.indexOf('{') + 1, -1);
      for (const decl of body.split(';')) {
        const colon = decl.indexOf(':');
        if (colon < 0) continue;
        const name = decl.slice(0, colon).trim();
        if (PREVIEW_COLOR_VARS.test(name)) decls.push(`${name}: ${decl.slice(colon + 1).trim()};`);
      }
    }
    return decls.length ? `:root {\n  ${decls.join('\n  ')}\n}` : '';
  }

  async previewTheme(themeId) {
    const seq = this.previewSeq;
    if (themeId === this.currentTheme) {
      this.cancelPreview();
      return;
    }

    if (themeId === '_adaptive') {
      // app.js builds the adaptive colors from the current artwork and writes them to previewEl
      this.previewEl.textContent = '';
      window.dispatchEvent(new CustomEvent('themepreview', { detail: { themeId, adaptive: true } }));
      return;
    }

    const data = await this.loadThemeData(themeId);
    // A newer hover, a leave, a close or a click happened while the CSS was loading
    if (!data || seq !== this.previewSeq) return;

    this.previewEl.textContent = this.colorsOnly(data.css);
    window.dispatchEvent(new CustomEvent('themepreview', { detail: { themeId, adaptive: false } }));
  }

  cancelPreview() {
    clearTimeout(this.previewTimer);
    this.previewTimer = null;
    this.previewSeq++;
    if (this.previewEl.textContent === '' && !this.previewing) return;
    this.previewing = false;
    this.previewEl.textContent = '';
    window.dispatchEvent(new CustomEvent('themepreview', { detail: { themeId: null } }));
  }

  // Wait before previewing so a quick sweep across the cards doesn't flash every theme.
  // The old preview stays up meanwhile, so going from card to card never flashes the committed theme.
  schedulePreview(themeId) {
    clearTimeout(this.previewTimer);
    this.previewSeq++;
    this.previewTimer = setTimeout(() => {
      this.previewTimer = null;
      this.previewing = true;
      this.previewTheme(themeId);
    }, 150);
  }

  scheduleCancel() {
    clearTimeout(this.previewTimer);
    this.previewSeq++;
    this.previewTimer = setTimeout(() => this.cancelPreview(), 60);
  }

  // Previews don't resize the window, save prefs or fire themechange: this does
  async applyTheme(themeId) {
    // Special handling for adaptive theme
    if (themeId === '_adaptive') {
      clearTimeout(this.previewTimer);
      this.previewSeq++;
      this.previewEl.textContent = '';
      this.previewing = false;
      this.currentTheme = '_adaptive';
      this.listEl.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === '_adaptive');
      });
      const prefs = await window.api.prefs.load();
      prefs.theme = '_adaptive';
      await window.api.prefs.save(prefs);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId: '_adaptive', adaptive: true } }));
      return true;
    }

    const data = await this.loadThemeData(themeId);
    if (!data) return false;

    // Swap committed and preview in the same tick, so the player never flashes in between
    clearTimeout(this.previewTimer);
    this.previewSeq++;
    this.previewEl.textContent = '';
    this.previewing = false;
    this.styleEl.textContent = data.css;
    this.currentTheme = themeId;

    // The window is resized by the themechange handler in app.js, which also knows about the playlist

    // Update active state in list
    this.listEl.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.id === themeId);
    });

    // Save preference
    const prefs = await window.api.prefs.load();
    prefs.theme = themeId;
    await window.api.prefs.save(prefs);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId, meta: data.meta, adaptive: false } }));

    return true;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _sanitizeColor(c) {
    // Only allow hex colors and basic color names
    if (typeof c !== 'string') return '#111';
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
    if (/^[a-zA-Z]+$/.test(c)) return c;
    return '#111';
  }

  renderThemeList() {
    this.listEl.innerHTML = '';

    // Filter themes by active category
    const filtered = this.activeCategory === 'All'
      ? this.themes
      : this.themes.filter(t => t.category === this.activeCategory);

    // Add special adaptive theme card at the top (only for All)
    if (this.activeCategory === 'All') {
      const adaptiveCard = document.createElement('div');
      adaptiveCard.className = `theme-card${this.currentTheme === '_adaptive' ? ' active' : ''}`;
      adaptiveCard.dataset.id = '_adaptive';
      adaptiveCard.innerHTML = `
        <div class="theme-card-preview theme-card-adaptive-preview">
          <svg width="100%" height="100%" viewBox="0 0 80 32"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6b9d"/><stop offset="33%" stop-color="#c56cf0"/><stop offset="66%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#4ade80"/></linearGradient></defs><rect width="80" height="32" rx="4" fill="url(#ag)" opacity="0.8"/></svg>
        </div>
        <div class="theme-card-name">Album Adaptive</div>
        <div class="theme-card-author">Colors from album art</div>
        <div class="theme-card-badge">Dynamic</div>
      `;
      this.wireCard(adaptiveCard, '_adaptive');
      this.listEl.appendChild(adaptiveCard);
    }

    for (const theme of filtered) {
      const card = document.createElement('div');
      card.className = `theme-card${this.currentTheme === theme.id ? ' active' : ''}`;
      card.dataset.id = theme.id;

      // Color preview swatches (sanitized to prevent CSS injection)
      const swatches = (theme.preview || ['#1a1a2e', '#00ff41', '#00d4aa', '#0a0a12']).map(c => this._sanitizeColor(c));
      const swatchHTML = swatches.map(c =>
        `<div class="theme-card-swatch" style="background:${c}"></div>`
      ).join('');

      card.innerHTML = `
        <div class="theme-card-preview" style="background:${swatches[0]}">${swatchHTML}</div>
        <div class="theme-card-name">${this._escapeHtml(theme.name || 'Untitled')}</div>
        <div class="theme-card-author">by ${this._escapeHtml(theme.author || 'Unknown')}</div>
        ${theme.builtin ? '<div class="theme-card-badge">Built-in</div>' : ''}
      `;

      this.wireCard(card, theme.id);
      this.listEl.appendChild(card);
    }
  }

  wireCard(card, themeId) {
    card.tabIndex = 0;
    card.addEventListener('click', () => this.applyTheme(themeId));
    card.addEventListener('mouseenter', () => this.schedulePreview(themeId));
    card.addEventListener('mouseleave', () => this.scheduleCancel());
    card.addEventListener('focus', () => this.schedulePreview(themeId));
    card.addEventListener('blur', () => this.scheduleCancel());
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.applyTheme(themeId);
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.panelEl.classList.toggle('open', this.isOpen);
    this.cancelPreview();
    if (this.isOpen) {
      this.themeCache.clear();
      this.loadThemeList().then(() => {
        this.renderTabs();
        this.renderThemeList();
      });
    }
  }

  close() {
    this.isOpen = false;
    this.panelEl.classList.remove('open');
    this.cancelPreview();
  }

  async installTheme() {
    const result = await window.api.themes.install();
    if (result && result.success) {
      this.themeCache.clear();
      await this.loadThemeList();
      this.renderTabs();
      this.renderThemeList();
      await this.applyTheme(result.themeId);
    }
  }
}

window.ThemeManager = ThemeManager;
