// ═══════════════════════════════════════════════════════════════════════════
// Visualizer — Canvas-based audio visualizer with multiple modes
// Responds to theme colors via CSS custom properties
// ═══════════════════════════════════════════════════════════════════════════

class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'bars'; // bars | wave | spectrum
    this.modes = ['bars', 'wave', 'spectrum'];
    this.bars = [];
    this.targetBars = [];
    this.frame = null;
    this.isPlaying = false;
    this.barCount = 32;

    // Initialize bars
    for (let i = 0; i < this.barCount; i++) {
      this.bars.push(0);
      this.targetBars.push(0);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
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

  getColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      color1: style.getPropertyValue('--viz-color-1').trim() || '#00ff41',
      color2: style.getPropertyValue('--viz-color-2').trim() || '#00d4aa',
      color3: style.getPropertyValue('--viz-color-3').trim() || '#00a8ff',
    };
  }

  setMode(mode) {
    if (this.modes.includes(mode)) {
      this.mode = mode;
    }
  }

  nextMode() {
    const idx = this.modes.indexOf(this.mode);
    this.mode = this.modes[(idx + 1) % this.modes.length];
    return this.mode;
  }

  setPlaying(playing) {
    this.isPlaying = playing;
    if (!playing) {
      // Decay bars to zero
      this.targetBars = this.targetBars.map(() => 0);
    }
  }

  // Simulate audio data (since we can't access Apple Music's audio stream)
  generateData() {
    if (!this.isPlaying) return;

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

  animate() {
    this.generateData();

    // Smooth interpolation
    for (let i = 0; i < this.barCount; i++) {
      const diff = this.targetBars[i] - this.bars[i];
      if (diff > 0) {
        this.bars[i] += diff * 0.15; // Rise fast
      } else {
        this.bars[i] += diff * 0.08; // Fall slow
      }
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    const colors = this.getColors();

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

    this.frame = requestAnimationFrame(() => this.animate());
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
    if (this.frame) cancelAnimationFrame(this.frame);
  }
}

window.Visualizer = Visualizer;
