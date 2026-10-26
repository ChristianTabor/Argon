const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { appBundlePath, assertPackagedApp } = require('../scripts/package-smoke');

const root = path.join(__dirname, '..');

function makeApp(dir, { html, version, bundleId }) {
  const payload = path.join(dir, 'payload');
  fs.mkdirSync(path.join(payload, 'src'), { recursive: true });
  fs.writeFileSync(path.join(payload, 'main.js'), 'main');
  fs.writeFileSync(path.join(payload, 'preload.js'), 'preload');
  if (html) fs.writeFileSync(path.join(payload, 'src', 'index.html'), '<html></html>');

  const contents = path.join(dir, 'Argon.app', 'Contents');
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true });
  fs.writeFileSync(path.join(contents, 'Info.plist'), `<?xml version="1.0"?>
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>${bundleId}</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
</dict></plist>`);
  execFileSync('npx', ['@electron/asar', 'pack', payload, path.join(contents, 'Resources', 'app.asar')], {
    cwd: root,
    stdio: 'pipe',
  });
  return path.join(dir, 'Argon.app');
}

describe('package smoke assertions', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-smoke-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('accepts a bundle with the id, version, and required files', () => {
    const app = makeApp(dir, { html: true, version: '1.2.3', bundleId: 'com.tabor.argon' });
    expect(() => assertPackagedApp(app, '1.2.3')).not.toThrow();
  });

  test('fails when src/index.html was left out of the archive', () => {
    const app = makeApp(dir, { html: false, version: '1.2.3', bundleId: 'com.tabor.argon' });
    expect(() => assertPackagedApp(app, '1.2.3')).toThrow(/src\/index\.html/);
  });

  test('fails when the bundle id does not match', () => {
    const app = makeApp(dir, { html: true, version: '1.2.3', bundleId: 'com.example.other' });
    expect(() => assertPackagedApp(app, '1.2.3')).toThrow(/CFBundleIdentifier/);
  });

  test('looks for the bundle inside the folder packager returns', () => {
    const app = makeApp(dir, { html: true, version: '1.2.3', bundleId: 'com.tabor.argon' });
    expect(appBundlePath(dir)).toBe(app);
    expect(() => assertPackagedApp(dir, '1.2.3')).toThrow(/Missing Info\.plist/);
  });
});
