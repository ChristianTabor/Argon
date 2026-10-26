# Security policy

## Supported versions

Only the latest release gets security fixes. Fixes ship as a new release; older builds aren't
patched.

| Version | Supported |
|---------|-----------|
| 1.1.x (latest) | Yes |
| 1.0.x | No |

## Reporting a vulnerability

Please report privately. Don't open a public issue, pull request or discussion with the
details.

Use GitHub's private reporting: on the repository's **Security** tab, click
**Report a vulnerability**. If that button isn't there, open an issue that asks for a private
contact, with no details of the problem, and a maintainer will reply.

Include:

- the Argon version (or commit) and your macOS version;
- what an attacker can do, and what they need first (a crafted theme file, a malicious track
  name, local access, and so on);
- steps or a proof of concept.

A maintainer will reply in the private report. Argon is a small project, so please allow some
time.

## Scope

In scope:

- **The AppleScript bridge.** Anything that gets text from the renderer, a theme or Music's
  track data into an AppleScript or a shell command (`main.js`).
- **The IPC surface.** Any `window.api` method that does more than it should, or input
  validation that can be bypassed (`preload.js`, `main.js`).
- **Theme import.** `.zip` themes are extracted with `unzip` into the user themes folder, and
  their CSS is injected into the page. Path traversal, files written outside that folder, or a
  theme escaping the Content Security Policy are in scope.
- **The renderer.** Script injection through track, artist, album, playlist, lyrics or theme
  metadata, or a way to load another page in Argon's window (it refuses navigation, new
  windows and drops).
- **Theme import checks.** A zip name or a symlink that gets past the install checks (see
  [docs/architecture.md](docs/architecture.md#theme-install-checks)).
- **Updates.** Argon doesn't update itself yet. When it does
  ([#8](https://github.com/ChristianTabor/Argon/issues/8)), the update mechanism is in scope.

Out of scope:

- Builds are only ad-hoc signed, not signed with a Developer ID or notarized. That's known and
  tracked in [#7](https://github.com/ChristianTabor/Argon/issues/7).
- Problems that need an attacker who can already run code as you, or edit Argon's files or
  `prefs.json` directly.
- Vulnerabilities in Electron, Chromium or macOS themselves. Report those upstream. An
  outdated Electron version in Argon is in scope.
