const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;

function asarHas(listed, filePath) {
  const want = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return listed.split(/\r?\n/).some((line) => line.trim() === want);
}

function assertPackagedApp(applicationPath, expectedVersion) {
  if (!fs.existsSync(applicationPath)) {
    throw new Error(`Missing app bundle: ${applicationPath}`);
  }
  const plistPath = path.join(applicationPath, 'Contents', 'Info.plist');
  const asarPath = path.join(applicationPath, 'Contents', 'Resources', 'app.asar');
  if (!fs.existsSync(plistPath)) {
    throw new Error(`Missing Info.plist: ${plistPath}`);
  }
  const plist = fs.readFileSync(plistPath, 'utf8');
  if (!plist.includes('<string>com.tabor.argon</string>')) {
    throw new Error('Info.plist is missing CFBundleIdentifier com.tabor.argon');
  }
  if (!plist.includes(`<string>${expectedVersion}</string>`)) {
    throw new Error(`Info.plist is missing version ${expectedVersion}`);
  }
  const listed = execFileSync('npx', ['@electron/asar', 'list', asarPath], {
    cwd: root,
    encoding: 'utf8',
  });
  for (const required of ['/main.js', '/preload.js', '/src/index.html']) {
    if (!asarHas(listed, required)) {
      throw new Error(`app.asar is missing ${required}`);
    }
  }
}

// Packager returns the output folder (dist-smoke/Argon-darwin-<arch>); the bundle is inside it
function appBundlePath(outputDir) {
  return path.join(outputDir, 'Argon.app');
}

// Same as release.yml: packaging breaks Electron's signature, so re-sign ad hoc, then verify
function signAdHoc(applicationPath) {
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', applicationPath], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', applicationPath], { stdio: 'inherit' });
}

async function packageSmoke() {
  const { packager } = await import('@electron/packager');
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const outDir = path.join(root, 'dist-smoke');
  fs.rmSync(outDir, { recursive: true, force: true });
  const appPaths = await packager({
    dir: root,
    name: 'Argon',
    platform: 'darwin',
    arch,
    out: outDir,
    overwrite: true,
    appBundleId: 'com.tabor.argon',
    appVersion: version,
    icon: path.join(root, 'assets', 'icon-matte.icns'),
    ignore: [
      /^\/dist/,
      /^\/coverage/,
      /^\/build-and-install\.sh/,
      /^\/\.git/,
      /^\/\.github/,
      /^\/\.claude/,
      /^\/assets/,
      /^\/test/,
      /THEME_GUIDE\.md/,
    ],
  });
  if (!appPaths || appPaths.length !== 1) {
    throw new Error(`Expected one packaged app, got ${JSON.stringify(appPaths)}`);
  }
  const applicationPath = appBundlePath(appPaths[0]);
  assertPackagedApp(applicationPath, version);
  signAdHoc(applicationPath);
  console.log(`Packaged, checked and signed ${path.relative(root, applicationPath)}`);
}

if (require.main === module) {
  // If the event loop drains before packaging settles (seen with Node 26 while Electron's zip is
  // extracted), fail instead of exiting 0 or waiting forever. CI uses Node 24.
  let settled = false;
  process.on('beforeExit', () => {
    if (settled) return;
    console.error('Packaging stopped before it finished. Run this with Node 24, as CI does.');
    process.exit(1);
  });
  packageSmoke().then(() => {
    settled = true;
  }).catch((err) => {
    settled = true;
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = { appBundlePath, assertPackagedApp, asarHas };
