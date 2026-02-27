// ═══════════════════════════════════════════════════════════════════════════
// Theme Manager — Load, switch, and manage themes with category tabs
// ═══════════════════════════════════════════════════════════════════════════

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

  async applyTheme(themeId) {
    // Special handling for adaptive theme
    if (themeId === '_adaptive') {
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

    const data = await window.api.themes.load(themeId);
    if (!data) return false;

    this.styleEl.textContent = data.css;
    this.currentTheme = themeId;

    // Parse window constraints directly from CSS text and resize immediately
    const css = data.css;
    const getProp = (name, def) => {
      const m = css.match(new RegExp(name.replace('--', '--') + ':\\s*(\\d+)'));
      return m ? parseInt(m[1]) : def;
    };
    const targetW  = getProp('--base-width',        300);
    const minW     = getProp('--window-min-width',   275);
    const minH     = getProp('--window-min-height',  440);
    const maxW     = getProp('--window-max-width',   800);
    const maxH     = getProp('--window-max-height', 1200);
    window.api.window.applyConstraints(minW, minH, maxW, maxH, targetW, minH);

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
      adaptiveCard.addEventListener('click', () => this.applyTheme('_adaptive'));
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

      card.addEventListener('click', () => this.applyTheme(theme.id));
      this.listEl.appendChild(card);
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.panelEl.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.loadThemeList().then(() => {
        this.renderTabs();
        this.renderThemeList();
      });
    }
  }

  close() {
    this.isOpen = false;
    this.panelEl.classList.remove('open');
  }

  async installTheme() {
    const result = await window.api.themes.install();
    if (result && result.success) {
      await this.loadThemeList();
      this.renderTabs();
      this.renderThemeList();
      await this.applyTheme(result.themeId);
    }
  }
}

window.ThemeManager = ThemeManager;
