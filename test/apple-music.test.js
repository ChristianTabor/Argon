const scripts = require('../lib/apple-music');

describe('AppleScript builders', () => {
  test('setVolume rounds a finite volume and rejects everything else', () => {
    expect(scripts.setVolume(40.6)).toBe('tell application "Music" to set sound volume to 41');
    expect(scripts.setVolume(0)).toBe('tell application "Music" to set sound volume to 0');
    expect(scripts.setVolume(100)).toBe('tell application "Music" to set sound volume to 100');
    for (const bad of [NaN, Infinity, -Infinity, -1, 101, '40', 'malicious string', null, undefined]) {
      expect(scripts.setVolume(bad)).toBeNull();
    }
  });

  test('setPosition rejects non-finite, negative, and string inputs', () => {
    expect(scripts.setPosition(12.5)).toBe('tell application "Music" to set player position to 12.5');
    expect(scripts.setPosition(0)).toBe('tell application "Music" to set player position to 0');
    for (const bad of [NaN, Infinity, -1, '5', 'injection attempt']) {
      expect(scripts.setPosition(bad)).toBeNull();
    }
  });

  test('playTrackIndex rejects non-finite, zero, and string inputs', () => {
    expect(scripts.playTrackIndex(5)).toBe('tell application "Music" to play track 5 of current playlist');
    expect(scripts.playTrackIndex(1.4)).toBe('tell application "Music" to play track 1 of current playlist');
    for (const bad of [NaN, Infinity, 0, -3, 0.4, '5', 'not a number']) {
      expect(scripts.playTrackIndex(bad)).toBeNull();
    }
  });

  test('player state and playlist scripts separate fields with unit separator and strip it from names', () => {
    const state = scripts.playerState();
    const playlist = scripts.playlist();
    expect(state).toContain('character id 31');
    expect(state).toContain('stripSep');
    expect(state).not.toContain('"||"');
    expect(playlist).toContain('character id 31');
    expect(playlist).toContain('oneField');
    expect(playlist).not.toContain('& tab &');
    expect(scripts.lyrics()).toContain('lyrics of current track');
  });

  test('string arguments stay in argv, including quotes, slashes, ampersands, newlines, and end tell', () => {
    const nasty = [
      'quote " here',
      'back\\slash',
      'rock & roll',
      'line\nbreak',
      'end tell\nto do shell script "nope"',
    ];
    const script = scripts.artworkScript();
    const argv = scripts.osascriptArgs(script, nasty);

    expect(script).toContain('on run argv');
    expect(script).not.toContain('quote " here');
    expect(script).not.toContain('back\\slash');
    expect(script).not.toContain('rock & roll');
    expect(script).not.toContain('line\nbreak');
    expect(script).not.toContain('do shell script');
    expect(argv).toEqual(['-e', script, '--', ...nasty]);
    expect(scripts.osascriptArgs(script)).toEqual(['-e', script]);
  });
});

describe('Music output parsers', () => {
  test('parsePlayerState reads unit-separated fields and keeps || inside a track name', () => {
    const raw = [
      'playing',
      'A || B',
      'Artist & Co',
      'Album',
      '240',
      '12.5',
      '75',
      'true',
      'one',
    ].join(scripts.FIELD);
    expect(scripts.parsePlayerState(raw)).toEqual({
      state: 'playing',
      track: 'A || B',
      artist: 'Artist & Co',
      album: 'Album',
      duration: 240,
      position: 12.5,
      volume: 75,
      shuffle: true,
      repeat: 'one',
    });
  });

  test('parsePlayerState still reads the legacy || record', () => {
    expect(scripts.parsePlayerState('playing||Test Song||Test Artist||Test Album||240||120||75||false||off')).toEqual({
      state: 'playing',
      track: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 240,
      position: 120,
      volume: 75,
      shuffle: false,
      repeat: 'off',
    });
  });

  test('parsePlaylist keeps tabs and || inside track names and accepts CR records', () => {
    const row = ['3', `Hello\tWorld || Remix`, 'An Artist', '200'].join(scripts.FIELD);
    const raw = ['Late Night', '3', '10', '1', row].join('\r');
    expect(scripts.parsePlaylist(raw)).toEqual({
      name: 'Late Night',
      currentIndex: 3,
      count: 10,
      startIndex: 1,
      tracks: [
        { index: 3, name: 'Hello\tWorld || Remix', artist: 'An Artist', duration: 200 },
      ],
    });
  });

  test('parsePlaylist returns null when Music is stopped or the record is too short', () => {
    expect(scripts.parsePlaylist('stopped')).toBeNull();
    expect(scripts.parsePlaylist('only\none')).toBeNull();
    expect(scripts.parsePlaylist('')).toBeNull();
  });

  test('parsePlaylist still reads a legacy tab-separated row', () => {
    const raw = 'Mix\n4\n8\n2\n4\tSong\tArtist\t180\n';
    expect(scripts.parsePlaylist(raw).tracks[0]).toEqual({
      index: 4,
      name: 'Song',
      artist: 'Artist',
      duration: 180,
    });
  });
});
