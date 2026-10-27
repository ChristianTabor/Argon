# Argon

Electron app for macOS that controls Apple Music (Winamp-style). It isn't an iOS app: there is no
simulator and no Xcode project here.

## Testing

How much to test: the test-plan skill, §2 ("Testing in proportion"). Argon's tests are already
light, so keep it that way:

- **Always:** `npm test` (Jest, a few seconds). Electron and Music are mocked, so it runs anywhere and
  needs no Automation permission.
- **A UI change:** run it once (`npm start`) and look at the changed part, at normal size. Back up
  `~/Library/Application Support/argon/prefs.json` first and never change what's playing.
- **A new test** only for logic a realistic bug would break, or the bug you just fixed.
- No scheduled or nightly runs, and no new CI workflows unless Christian asks. The release workflow
  runs `npm test` on pushes to `main`.
- What needs his Mac (the packaged app, Dock and tray behaviour, real Music playback) goes on his
  short list, not in a suite.

## Branches

Every push to `main` publishes a release, so `main` takes hotfixes only. Feature, docs and chore
branches target `release/2.0`.
