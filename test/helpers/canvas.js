function create2dContext() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    _lastY: 0,
    scale() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    stroke() {},
    drawImage() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)) };
    },
  };
}

function installCanvasStub() {
  const ctx = create2dContext();
  window.HTMLCanvasElement.prototype.getContext = () => ctx;
  return ctx;
}

module.exports = { create2dContext, installCanvasStub };
