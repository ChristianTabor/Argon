// ═══════════════════════════════════════════════════════════════════════════
// Visualizer — Canvas-based audio visualizer with multiple modes
// Responds to theme colors via CSS custom properties
// ═══════════════════════════════════════════════════════════════════════════

// Bars below this are snapped to zero once playback stops, so the loop can idle
const VIZ_EPSILON = 0.005;
// Pause/stop settle to flat in about 300 ms, a track boundary leaves a 150 ms gap
const VIZ_SETTLE_FALL = 0.25;
const VIZ_TRACK_GAP_MS = 150;

class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'bars'; // bars | wave | spectrum
    this.modes = ['bars', 'wave', 'spectrum'];
    this.bars = [];
    this.targetBars = [];
    this.frame = null;
    this.state = 'stopped'; // playing | paused | stopped | seeking
    this.silentUntil = 0;
    this.colors = null;
    this.barCount = 32;
    this.hidden = document.visibilityState === 'hidden';
    this.reducedMotion = false;

    // Initialize bars
    for (let i = 0; i < this.barCount; i++) {
      this.bars.push(0);
      this.targetBars.push(0);
    }

    this.refreshColors();
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.start();
    });

    // Don't animate while the window is hidden or minimized
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.visibilityState === 'hidden';
      if (this.hidden) this.stop();
      else this.start();
    });

    // Reduced motion renders one static frame instead of animating
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = query.matches;
      query.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        this.start();
      });
    }

    // Recolor when a theme, adaptive colors, transparency or text mode rewrite the styles
    window.addEventListener('themechange', () => this.refreshColors());
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => this.refreshColors())
        .observe(document.head, { childList: true, characterData: true, subtree: true });
    }

    this.start();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  // Read the --viz-color-* variables once, not on every frame
  refreshColors() {
    const style = getComputedStyle(document.documentElement);
    this.colors = {
      color1: style.getPropertyValue('--viz-color-1').trim() || '#00ff41',
      color2: style.getPropertyValue('--viz-color-2').trim() || '#00d4aa',
      color3: style.getPropertyValue('--viz-color-3').trim() || '#00a8ff',
    };
    this.start();
  }

  setMode(mode) {
    if (this.modes.includes(mode)) {
      this.mode = mode;
      this.start();
    }
  }

  nextMode() {
    const idx = this.modes.indexOf(this.mode);
    this.mode = this.modes[(idx + 1) % this.modes.length];
    this.start();
    return this.mode;
  }

  setState(state) {
    if (state === this.state) return;
    this.state = state;
    this.start();
  }

  // A real track boundary has a beat of silence before the new energy
  trackChanged() {
    this.silentUntil = Date.now() + VIZ_TRACK_GAP_MS;
    this.start();
  }

  start() {
    if (this.frame || this.hidden) return;
    this.frame = requestAnimationFrame(() => this.animate());
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  get isActive() {
    return this.state === 'playing' || this.state === 'seeking';
  }

  // Simulate audio data (since we can't access Apple Music's audio stream)
  generateData() {
    const inGap = Date.now() < this.silentUntil;

    if (!this.isActive || inGap) {
      this.targetBars.fill(0);
      return;
    }

    if (this.reducedMotion) {
      // Static, low-energy frame
      for (let i = 0; i < this.barCount; i++) {
        const midBoost = Math.exp(-Math.pow((i - this.barCount * 0.3) / (this.barCount * 0.25), 2));
        this.targetBars[i] = 0.08 + midBoost * 0.2;
      }
      return;
    }

    if (this.state === 'seeking') {
      // Scrubbing flutters instead of following the music
      for (let i = 0; i < this.barCount; i++) {
        this.targetBars[i] = 0.1 + Math.random() * 0.4;
      }
      return;
    }

    for (let i = 0; i < this.barCount; i++) {
      // Create organic-looking frequency distribution
      const baseFreq = Math.sin(Date.now() * 0.001 + i * 0.3) * 0.3;
      const midBoost = Math.exp(-Math.pow((i - this.barCount * 0.3) / (this.barCount * 0.25), 2));
      const noise = Math.random() * 0.4;
      const beat = Math.sin(Date.now() * 0.003) > 0.7 ? Math.random() * 0.3 : 0;

      this.targetBars[i] = Math.max(0.05, Math.min(1,
        midBoost * 0.6 + baseFreq + noise * 0.5 + beat
      ));
    }
  }

  // The loop idles once playback is off and every bar has settled
  needsFrames() {
    if (this.hidden || this.reducedMotion) return false;
    if (this.isActive || Date.now() < this.silentUntil) return true;
    return this.bars.some((b) => b > 0);
  }

  animate() {
    this.frame = null;
    this.generateData();

    // Smooth interpolation
    const settling = !this.isActive || Date.now() < this.silentUntil;
    for (let i = 0; i < this.barCount; i++) {
      const diff = this.targetBars[i] - this.bars[i];
      if (this.reducedMotion) {
        this.bars[i] = this.targetBars[i];
      } else if (diff > 0) {
        this.bars[i] += diff * 0.15; // Rise fast
      } else {
        this.bars[i] += diff * (settling ? VIZ_SETTLE_FALL : 0.08); // Fall slow
      }
      if (settling && this.bars[i] < VIZ_EPSILON) this.bars[i] = 0;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    const colors = this.colors;

    switch (this.mode) {
      case 'bars':
        this.drawBars(colors);
        break;
      case 'wave':
        this.drawWave(colors);
        break;
      case 'spectrum':
        this.drawSpectrum(colors);
        break;
    }

    if (this.needsFrames()) this.start();
  }

  drawBars(colors) {
    const gap = 2;
    const barWidth = (this.width - gap * (this.barCount - 1)) / this.barCount;
    const maxHeight = this.height - 4;

    for (let i = 0; i < this.barCount; i++) {
      const x = i * (barWidth + gap);
      const h = this.bars[i] * maxHeight;
      const y = this.height - h;

      // Gradient per bar
      const gradient = this.ctx.createLinearGradient(x, this.height, x, y);
      const t = i / this.barCount;
      if (t < 0.5) {
        gradient.addColorStop(0, colors.color1);
        gradient.addColorStop(1, colors.color2);
      } else {
        gradient.addColorStop(0, colors.color2);
        gradient.addColorStop(1, colors.color3);
      }

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, barWidth, h);

      // Peak dot
      if (this.bars[i] > 0.1) {
        this.ctx.fillStyle = colors.color1;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillRect(x, y - 2, barWidth, 1.5);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  drawWave(colors) {
    const midY = this.height / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(0, midY);

    for (let i = 0; i < this.barCount; i++) {
      const x = (i / (this.barCount - 1)) * this.width;
      const amp = this.bars[i] * (this.height * 0.4);
      const wave = Math.sin(Date.now() * 0.002 + i * 0.5);
      const y = midY + wave * amp;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        const prevX = ((i - 1) / (this.barCount - 1)) * this.width;
        const cpx = (prevX + x) / 2;
        this.ctx.quadraticCurveTo(prevX, this.ctx._lastY || midY, cpx, y);
      }
      this.ctx._lastY = y;
    }

    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, colors.color1);
    gradient.addColorStop(0.5, colors.color2);
    gradient.addColorStop(1, colors.color3);

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Glow effect
    this.ctx.globalAlpha = 0.15;
    this.ctx.lineWidth = 6;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawSpectrum(colors) {
    const midY = this.height / 2;

    // Mirror bars (top and bottom)
    const gap = 1;
    const barWidth = (this.width - gap * (this.barCount - 1)) / this.barCount;

    for (let i = 0; i < this.barCount; i++) {
      const x = i * (barWidth + gap);
      const h = this.bars[i] * (this.height * 0.45);

      const t = i / this.barCount;
      const gradient = this.ctx.createLinearGradient(x, midY - h, x, midY + h);
      gradient.addColorStop(0, colors.color3);
      gradient.addColorStop(0.5, colors.color1);
      gradient.addColorStop(1, colors.color3);

      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = 0.85;

      // Top half
      this.ctx.fillRect(x, midY - h, barWidth, h);
      // Bottom half (mirror)
      this.ctx.fillRect(x, midY, barWidth, h);

      this.ctx.globalAlpha = 1;
    }

    // Center line
    this.ctx.strokeStyle = colors.color1;
    this.ctx.globalAlpha = 0.3;
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, midY);
    this.ctx.lineTo(this.width, midY);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  destroy() {
    this.stop();
  }
}

window.Visualizer = Visualizer;
