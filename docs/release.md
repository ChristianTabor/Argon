# Releases

## How a release is cut today

Every push to `main` publishes a GitHub release. There's no manual step and no tag to push.

`.github/workflows/release.yml` runs on `macos-latest` with Node 20:

1. `npm ci`
2. `npm test`. A failing test stops the release.
3. Packages Argon twice with `@electron/packager`, for `x64` and `arm64`, with bundle id
   `com.tabor.argon`, the version from `package.json`, and the icon
   `assets/icon-matte.icns`. The `--ignore` flags leave out `dist`, `build-and-install.sh`,
   `.git`, `.github`, `.claude`, `assets`, `test` and `THEME_GUIDE.md`.
4. Zips each app with `zip -r -y`, which keeps the symlinks inside the Electron framework.
5. Creates a release with
   [softprops/action-gh-release](https://github.com/softprops/action-gh-release):
   - tag `v<version>-<run number>`, for example `v1.1.0-4`;
   - title `Argon v<version> (build <run number>)`;
   - assets `Argon-darwin-arm64.zip` and `Argon-darwin-x64.zip`;
   - a body that names the commit. Release notes are written by hand afterwards.

The run number counts every run of the workflow, so build numbers keep going up across
versions.

### Versions

The version comes from `package.json`. Bump it before, or together with, the change that
should ship under the new number, or the release goes out under the old one. (`v1.0.0-3` and
`v1.1.0-4` have the same code for this reason.)

### Signing

Release builds aren't code-signed or notarized. The packaged app carries only the ad-hoc
signature that Electron's binaries come with, so Gatekeeper blocks it after a browser
download. The README explains how users get past that.

### Building locally

`npm run build` runs `build-and-install.sh`. It's for the maintainer's machine:

- it regenerates `assets/icon-matte.icns` and `assets/icon-glass.icns` from the SVGs, which
  changes committed files;
- it builds two apps for the current architecture, **Argon** and **Argon Glass**;
- it ad-hoc signs them with `codesign --sign -`, deletes any existing copies in
  `/Applications`, copies the new ones there and clears their extended attributes.

To try a change, use `npm start` instead.

## What's planned

These are open issues, not current behavior:

- [#3](https://github.com/ChristianTabor/Argon/issues/3): a CI workflow that runs tests on
  pull requests and gates releases.
- [#7](https://github.com/ChristianTabor/Argon/issues/7): signed and notarized builds, and a
  Homebrew cask that's bumped on each release.
- [#8](https://github.com/ChristianTabor/Argon/issues/8): checking for and installing updates
  from inside Argon.

Update this page when they land.
