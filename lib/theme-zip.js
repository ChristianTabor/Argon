const { execFile } = require('child_process');

function isUnsafeZipEntry(name) {
  if (typeof name !== 'string' || name.length === 0) return true;
  const normalized = name.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.startsWith('~')) return true;
  if (/^[A-Za-z]:/.test(normalized)) return true;
  return normalized.split('/').some((part) => part === '..');
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

module.exports = { isUnsafeZipEntry, listZipEntries };
