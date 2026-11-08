/**
 * @jest-environment jsdom
 */

const { installCanvasStub } = require('./helpers/canvas');

describe('Visualizer', () => {
  let canvas;
  let parent;

  beforeEach(() => {
    installCanvasStub();
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
    document.body.innerHTML = '';
    parent = document.createElement('div');
    canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    document.body.appendChild(parent);
    parent.getBoundingClientRect = () => ({
      width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
    });
    require('../src/js/visualizer.js');
  });

  function createViz() {
    return new window.Visualizer(canvas);
  }

  test('nextMode cycles bars, wave, and spectrum', () => {
    const viz = createViz();
    expect(viz.mode).toBe('bars');
    expect(viz.nextMode()).toBe('wave');
    expect(viz.nextMode()).toBe('spectrum');
    expect(viz.nextMode()).toBe('bars');
  });

  test('setMode ignores an unknown mode', () => {
    const viz = createViz();
    viz.setMode('wave');
    viz.setMode('not-a-mode');
    expect(viz.mode).toBe('wave');
  });

  test('pausing settles every bar to exactly 0', () => {
    const viz = createViz();
    viz.setState('playing');
    for (let i = 0; i < 20; i++) viz.animate();
    expect(Math.max(...viz.bars)).toBeGreaterThan(0);
    viz.setState('paused');
    viz.animate();
    expect(viz.targetBars.every((value) => value === 0)).toBe(true);
    for (let i = 0; i < 200; i++) viz.animate();
    expect(viz.bars.every((value) => value === 0)).toBe(true);
  });

  test('drawing at 0×0 does not throw', () => {
    const viz = createViz();
    expect(viz.width).toBe(0);
    expect(viz.height).toBe(0);
    expect(() => {
      viz.setMode('bars');
      viz.animate();
      viz.setMode('wave');
      viz.animate();
      viz.setMode('spectrum');
      viz.animate();
    }).not.toThrow();
    viz.destroy();
  });
});
