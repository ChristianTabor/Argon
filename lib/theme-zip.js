// Checks for installing and loading themes. themes:install runs all three: the theme name,
// then every entry in the zip before it's extracted, then the extracted folder for symlinks.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Theme folder names: no slashes and no `..`. themes:load uses the same rule. Without it, a zip
// named "..zip" or "...zip" resolves to the themes folder or userData itself, which a failed
// install then deletes.
function isSafeThemeName(name) {
  return typeof name === 'string' && name.length > 0 && name !== '.' && !/[\/\\]|\.\./.test(name);
}

// Zip entries must stay inside the theme folder: no `..` parts, absolute paths or drive letters
function isUnsafeZipEntry(name) {
  if (typeof name !== 'string' || name.length === 0) return true;
  const normalized = name.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.startsWith('~')) return true;
  if (/^[A-Za-z]:/.test(normalized)) return true;
  return normalized.split('/').some((part) => part === '..');
}

// Zips can carry symlinks, and loading the theme would read whatever they point at
function containsSymlink(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    const stat = fs.lstatSync(entryPath);
    if (stat.isSymbolicLink()) return true;
    if (stat.isDirectory() && containsSymlink(entryPath)) return true;
  }
  return false;
}

function listZipEntries(filePath) {
  return new Promise((resolve, reject) => {
    execFile('unzip', ['-Z', '-1', filePath], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr && String(stderr).trim();
        reject(new Error(detail || err.message));
        return;
      }
      const entries = String(stdout || '')
        .split(/\r?\n/)
        .filter((line) => line.length > 0);
      resolve(entries);
    });
  });
}

module.exports = { isSafeThemeName, isUnsafeZipEntry, containsSymlink, listZipEntries };
