const { isUnsafeZipEntry } = require('../lib/theme-zip');

describe('theme zip entries', () => {
  test('rejects traversal, absolute paths, and empty names', () => {
    expect(isUnsafeZipEntry('../outside.txt')).toBe(true);
    expect(isUnsafeZipEntry('foo/../../outside.txt')).toBe(true);
    expect(isUnsafeZipEntry('..\\outside.txt')).toBe(true);
    expect(isUnsafeZipEntry('/etc/passwd')).toBe(true);
    expect(isUnsafeZipEntry('C:/Windows/note.txt')).toBe(true);
    expect(isUnsafeZipEntry('~/secret')).toBe(true);
    expect(isUnsafeZipEntry('')).toBe(true);
    expect(isUnsafeZipEntry(null)).toBe(true);
  });

  test('allows a theme at the root or nested one folder down', () => {
    expect(isUnsafeZipEntry('theme.json')).toBe(false);
    expect(isUnsafeZipEntry('Cool Theme/theme.json')).toBe(false);
    expect(isUnsafeZipEntry('good..name/theme.css')).toBe(false);
  });
});
