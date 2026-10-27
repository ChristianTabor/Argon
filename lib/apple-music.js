// Apple Music AppleScript builders and output parsers.
// Strings go through osascript argv (`on run argv`); they are not interpolated.

const FIELD = '\u001f';

const fieldHelpers = `on stripSep(t)
  if t is missing value then return ""
  set t to t as string
  set AppleScript's text item delimiters to character id 31
  set parts to text items of t
  set AppleScript's text item delimiters to ""
  return parts as string
end stripSep

on oneField(t)
  set t to my stripSep(t)
  set AppleScript's text item delimiters to return
  set parts to text items of t
  set AppleScript's text item delimiters to ""
  set t to parts as string
  set AppleScript's text item delimiters to linefeed
  set parts to text items of t
  set AppleScript's text item delimiters to ""
  return parts as string
end oneField`;

const playerStateScript = `${fieldHelpers}
tell application "Music"
  set playerState to player state as string
  set trackName to ""
  set trackArtist to ""
  set trackAlbum to ""
  set trackDuration to 0
  set playerPos to 0
  set playerVol to sound volume
  set isShuffling to false
  set repeatMode to "off"
  set trackBitRate to "0"
  set trackSampleRate to "0"
  set trackPersistentId to ""
  set trackFavorited to "false"

  if playerState is not "stopped" then
    set trackName to my stripSep(name of current track)
    set trackArtist to my stripSep(artist of current track)
    set trackAlbum to my stripSep(album of current track)
    set trackDuration to duration of current track
    set playerPos to player position
    set isShuffling to shuffle enabled
    set repeatMode to song repeat as string
    try
      set trackBitRate to (bit rate of current track) as string
    end try
    try
      set trackSampleRate to (sample rate of current track) as string
    end try
    try
      set trackPersistentId to (persistent ID of current track) as string
    end try
    try
      set trackFavorited to (favorited of current track) as string
    end try
  end if

  set sep to character id 31
  return playerState & sep & trackName & sep & trackArtist & sep & trackAlbum & sep & trackDuration & sep & playerPos & sep & playerVol & sep & isShuffling & sep & repeatMode & sep & trackBitRate & sep & trackSampleRate & sep & trackPersistentId & sep & trackFavorited
end tell`;

// Toggles `favorited` on the current track, but only if it's still the track the user saw.
// Returns the new value (true/false) or 'stale' when the track changed in the meantime.
const toggleFavoriteScriptSource = `on run argv
  tell application "Music"
    set t to current track
    if persistent ID of t is not (item 1 of argv) then return "stale"
    set favorited of t to not (favorited of t)
    return favorited of t as string
  end tell
end run`;

const playlistScript = `${fieldHelpers}
tell application "Music"
  if player state is stopped then return "stopped"

  set curPlaylist to current playlist
  set pName to name of curPlaylist
  set tCount to count of tracks of curPlaylist
  set curIdx to index of current track

  set s to curIdx - 15
  if s < 1 then set s to 1
  set e to s + 29
  if e > tCount then set e to tCount
  if (e - s) < 29 and s > 1 then
    set s to e - 29
    if s < 1 then set s to 1
  end if

  set sep to character id 31
  set r to my oneField(pName) & return & curIdx & return & tCount & return & s & return

  repeat with i from s to e
    tell track i of curPlaylist
      set tN to name
      set tA to artist
      set tD to duration
    end tell
    set r to r & i & sep & my oneField(tN) & sep & my oneField(tA) & sep & (tD as integer) & return
  end repeat

  return r
end tell`;

const lyricsScript = `
tell application "Music"
  if player state is not stopped then
    try
      return lyrics of current track
    on error
      return ""
    end try
  else
    return ""
  end if
end tell
`;

const toggleRepeatScript = `
tell application "Music"
  if song repeat is off then
    set song repeat to all
    return "all"
  else if song repeat is all then
    set song repeat to one
    return "one"
  else
    set song repeat to off
    return "off"
  end if
end tell
`;

const artworkScriptSource = `on run argv
  set tmpPath to item 1 of argv
  tell application "Music"
    if player state is not stopped then
      try
        set artData to data of artwork 1 of current track
        set tmpFile to POSIX file tmpPath
        set fileRef to open for access tmpFile with write permission
        set eof fileRef to 0
        write artData to fileRef
        close access fileRef
        return tmpPath
      on error errMsg
        try
          close access tmpFile
        end try
        return "none"
      end try
    else
      return "none"
    end if
  end tell
end run`;

const PERSISTENT_ID_RE = /^[0-9A-F]{16}$/i;

function isUsableNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function setVolume(vol) {
  if (!isUsableNumber(vol) || vol < 0 || vol > 100) return null;
  return `tell application "Music" to set sound volume to ${Math.round(vol)}`;
}

function setPosition(pos) {
  if (!isUsableNumber(pos) || pos < 0) return null;
  return `tell application "Music" to set player position to ${pos}`;
}

function playTrackIndex(index) {
  if (!isUsableNumber(index)) return null;
  const i = Math.round(index);
  if (i < 1) return null;
  return `tell application "Music" to play track ${i} of current playlist`;
}

function play() {
  return 'tell application "Music" to play';
}

function pause() {
  return 'tell application "Music" to pause';
}

function playpause() {
  return 'tell application "Music" to playpause';
}

function next() {
  return 'tell application "Music" to next track';
}

function previous() {
  return 'tell application "Music" to previous track';
}

// Volume up or down by a fixed step, for the Cmd+Shift shortcuts
function nudgeVolume(delta) {
  if (!Number.isInteger(delta)) return null;
  const op = delta < 0 ? '-' : '+';
  return `tell application "Music" to set sound volume to (sound volume ${op} ${Math.abs(delta)})`;
}

function toggleShuffle() {
  return 'tell application "Music" to set shuffle enabled to not shuffle enabled';
}

function playerState() {
  return playerStateScript;
}

function playlist() {
  return playlistScript;
}

function lyrics() {
  return lyricsScript;
}

function toggleRepeat() {
  return toggleRepeatScript;
}

function artworkScript() {
  return artworkScriptSource;
}

function toggleFavoriteScript() {
  return toggleFavoriteScriptSource;
}

function isPersistentId(value) {
  return typeof value === 'string' && PERSISTENT_ID_RE.test(value);
}

// Bit rate / sample rate from Music: 0, "missing value" and anything non-numeric mean unknown
function parseRate(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function osascriptArgs(script, args) {
  const argv = ['-e', script];
  if (args && args.length > 0) {
    argv.push('--');
    for (const arg of args) argv.push(String(arg));
  }
  return argv;
}

function splitFields(text, legacyDelimiter) {
  const value = String(text == null ? '' : text);
  if (value.includes(FIELD)) return value.split(FIELD);
  return value.split(legacyDelimiter);
}

function stoppedState() {
  return {
    state: 'stopped',
    track: '',
    artist: '',
    album: '',
    duration: 0,
    position: 0,
    volume: 50,
    shuffle: false,
    repeat: 'off',
    bitRate: null,
    sampleRate: null,
    persistentId: '',
    favorited: false,
  };
}

function parsePlayerState(result) {
  const parts = splitFields(result, '||');
  return {
    state: parts[0] || 'stopped',
    track: parts[1] || '',
    artist: parts[2] || '',
    album: parts[3] || '',
    duration: parseFloat(parts[4]) || 0,
    position: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6], 10) || 50,
    shuffle: parts[7] === 'true',
    repeat: parts[8] || 'off',
    bitRate: parseRate(parts[9]),
    sampleRate: parseRate(parts[10]),
    persistentId: isPersistentId(parts[11]) ? parts[11] : '',
    favorited: parts[12] === 'true',
  };
}

// Output of toggleFavoriteScript: the new value, 'stale', or an error for anything else
function parseToggleFavorite(result) {
  if (result === 'true') return true;
  if (result === 'false') return false;
  if (result === 'stale') return 'stale';
  throw new Error('Unexpected response from Music');
}

function parsePlaylist(result) {
  if (result == null) return null;
  const text = String(result).trim();
  if (text === '' || text === 'stopped') return null;

  const lines = text.split(/\r?\n|\r/).filter(Boolean);
  if (lines.length < 4) return null;

  const tracks = lines.slice(4).map((line) => {
    const parts = splitFields(line, '\t');
    return {
      index: parseInt(parts[0], 10) || 0,
      name: parts[1] || '',
      artist: parts[2] || '',
      duration: parseInt(parts[3], 10) || 0,
    };
  });

  return {
    name: lines[0],
    currentIndex: parseInt(lines[1], 10) || 0,
    count: parseInt(lines[2], 10) || 0,
    startIndex: parseInt(lines[3], 10) || 1,
    tracks,
  };
}

module.exports = {
  FIELD,
  setVolume,
  setPosition,
  playTrackIndex,
  play,
  pause,
  playpause,
  next,
  previous,
  nudgeVolume,
  toggleShuffle,
  playerState,
  playlist,
  lyrics,
  toggleRepeat,
  artworkScript,
  toggleFavoriteScript,
  isPersistentId,
  parseRate,
  osascriptArgs,
  stoppedState,
  parsePlayerState,
  parseToggleFavorite,
  parsePlaylist,
};
