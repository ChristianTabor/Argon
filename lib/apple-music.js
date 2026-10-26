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

  if playerState is not "stopped" then
    set trackName to my stripSep(name of current track)
    set trackArtist to my stripSep(artist of current track)
    set trackAlbum to my stripSep(album of current track)
    set trackDuration to duration of current track
    set playerPos to player position
    set isShuffling to shuffle enabled
    set repeatMode to song repeat as string
  end if

  set sep to character id 31
  return playerState & sep & trackName & sep & trackArtist & sep & trackAlbum & sep & trackDuration & sep & playerPos & sep & playerVol & sep & isShuffling & sep & repeatMode
end tell`;

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
  };
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
  toggleShuffle,
  playerState,
  playlist,
  lyrics,
  toggleRepeat,
  artworkScript,
  osascriptArgs,
  stoppedState,
  parsePlayerState,
  parsePlaylist,
};
