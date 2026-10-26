/**
 * Tests for docs/architecture.md — keeps the IPC, prefs and shortcut tables in step with the code
 */

const fs = require('fs');
const path = require('path');

const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf-8');

const mainCode = read('main.js');
const preloadCode = read('preload.js');
const architecture = read('docs', 'architecture.md');

// The text of a "## " section, up to the next "## " heading
function section(markdown, heading) {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start === -1) throw new Error(`docs/architecture.md has no "## ${heading}" section`);
  const end = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}

// First-column values of table rows, such as `music:getState`
function tableKeys(markdown) {
  return [...markdown.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(m => m[1]);
}

const matches = (code, re) => [...code.matchAll(re)].map(m => m[1]);

describe('IPC reference in docs/architecture.md', () => {
  const documented = tableKeys(section(architecture, 'IPC channel reference'));
  const handled = matches(mainCode, /ipcMain\.handle\('([^']+)'/g);
  const sent = matches(mainCode, /webContents\.send\('([^']+)'/g);
  const invoked = matches(preloadCode, /ipcRenderer\.invoke\('([^']+)'/g);
  const listened = matches(preloadCode, /ipcRenderer\.on\('([^']+)'/g);

  test('finds channels in the code and the docs', () => {
    expect(handled.length).toBeGreaterThan(0);
    expect(invoked.length).toBeGreaterThan(0);
    expect(documented.length).toBeGreaterThan(0);
  });

  test('documents every channel main.js handles or sends', () => {
    const missing = [...handled, ...sent].filter(c => !documented.includes(c));
    expect(missing).toEqual([]);
  });

  test('documents every channel preload.js uses', () => {
    const missing = [...invoked, ...listened].filter(c => !documented.includes(c));
    expect(missing).toEqual([]);
  });

  test('documents no channel that the code lacks', () => {
    const known = new Set([...handled, ...sent, ...invoked, ...listened]);
    const extra = documented.filter(c => !known.has(c));
    expect(extra).toEqual([]);
  });

  test('lists each channel once', () => {
    const dupes = documented.filter((c, i) => documented.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('Prefs table in docs/architecture.md', () => {
  const rows = section(architecture, 'Prefs').split('\n').filter(line => /^\|\s*`/.test(line));
  const documented = tableKeys(rows.join('\n'));
  const allowedBody = mainCode.match(/const allowed = \{([\s\S]*?)\};/)[1];
  const allowed = Object.fromEntries(
    [...allowedBody.matchAll(/(\w+):\s*'(\w+)'/g)].map(m => [m[1], m[2]])
  );

  test('finds the prefs whitelist in main.js', () => {
    expect(Object.keys(allowed).length).toBeGreaterThan(0);
  });

  test('documents every whitelisted pref with its type', () => {
    for (const [key, type] of Object.entries(allowed)) {
      const row = rows.find(r => r.startsWith(`| \`${key}\` |`));
      expect({ key, documented: Boolean(row) }).toEqual({ key, documented: true });
      const typeCell = row.split('|')[2];
      expect({ key, type: typeCell.includes(`\`${type}\``) }).toEqual({ key, type: true });
    }
  });

  test('documents no pref that the whitelist lacks', () => {
    const extra = documented.filter(k => !(k in allowed));
    expect(extra).toEqual([]);
  });
});

describe('Shortcut groups table in docs/architecture.md', () => {
  const start = architecture.indexOf('\n### Shortcut groups\n');
  const rows = architecture.slice(start).split('\n\n').find(block => block.startsWith('| Group'))
    .split('\n').slice(2).map(line => line.split('|').map(cell => cell.trim()));
  // Blank group cells continue the group above
  let group = '';
  const documented = rows.map(cells => {
    if (cells[1]) group = cells[1].replace(/`/g, '');
    return `${group} ${cells[4].replace(/`/g, '')}`;
  });

  const groupsBody = mainCode.match(/const SHORTCUT_GROUPS = \{([\s\S]*?)\n\};/)[1];
  const registered = [];
  for (const [, name, body] of groupsBody.matchAll(/^ {2}(\w+): \{([\s\S]*?)^ {2}\},/gm)) {
    for (const [, accelerator] of body.matchAll(/^ {4}'?([\w+]+)'?:/gm)) {
      registered.push(`${name} ${accelerator.replace('CommandOrControl', 'Cmd')}`);
    }
  }

  test('finds the shortcut groups in the code and the docs', () => {
    expect(start).toBeGreaterThan(-1);
    expect(registered.length).toBeGreaterThan(0);
  });

  test('lists every shortcut in its group, and nothing else', () => {
    expect([...documented].sort()).toEqual([...registered].sort());
  });
});
