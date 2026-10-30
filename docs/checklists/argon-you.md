# Argon: what only you can check

> Full plan: [archive/argon.md](archive/argon.md)
> Quit the installed Argon first. There's no single-instance lock, so two copies fight over Cmd+Shift+M and the tray. Then run:
> ```
> cd ~/.worktrees/argon/windowshade-fixes && npm start
> ```
> It shares prefs with the installed app (`~/Library/Application Support/argon`). From source the Dock shows Electron's icon; the real icon is checked on the release build in section 5.
> Known and left for 2.0: a Dock flash at launch when the icon is hidden; leaving windowshade resets the window to its default size; Classic cuts off its bottom bar in normal mode.

## 1. Windowshade bar

- [x] **Switch modes three ways**: Cmd+Shift+M from another app, the titlebar button, and the bar's Exit Windowshade button
- [x] **It looks like Winamp's windowshade** in a few themes (try Default, Classic and a light one): one tidy strip, readable text, nothing crowded
- [x] **320px is the right default width** (Morgan's pick; tell me if you'd rather have 340)
- [x] **Drag an edge**: it stops at 280 and 600 wide, the height stays at 28, and nothing clips at 280
- [x] **Track text** reads "Track — Artist", changes with the track, and a long title cuts off cleanly
- [x] **Prev, Play/Pause and Next** control Music, and the play/pause icon follows
- [x] **Click the seek bar**: Music jumps there and the fill moves at once. A click just above or below the line still seeks, and dragging anywhere else on the bar moves the window
- [x] **Pin** keeps the bar above other windows and lights up; the titlebar pin matches when you leave windowshade
- [x] **Minimize and Close** in the bar do what they say
- [x] **Quit while in windowshade and start again**: it comes back as the bar

## 2. Closed window and the tray

- [x] **Close the window, then press Cmd+Shift+M**: it comes back, with no error dialog
- [x] **Close the window, then open the tray menu**: it says Show Window, and choosing it brings the window back. After hiding and showing, the Show/Hide label still matches
- [x] **Bring it back from behind other windows**: with another app's windows over Argon (or Argon minimized), the ♪ menu says Show Window and brings Argon to the front. It says Hide Window only when Argon is in front or pinned
- [x] **Click the ♪ icon**: Argon comes to the front (from behind other windows, minimized, hidden or closed) and the menu opens, every time. Right-click (or Control-click) opens the menu without moving Argon

## 3. Dock icon

- [x] **Tray → Show Dock Icon** starts checked. Unchecking it removes the Dock icon at once and Argon keeps focus; checking it brings the icon back
- [x] **Restart with it unchecked**: no Dock icon once it's open (the brief flash at launch is the known 2.0 item)

## 4. Before I commit

- [x] **The wording**: "Windowshade" in the tooltip, the exit button and the README, and "Show Dock Icon" in the tray menu
- [x] **The diff**: `git -C ~/.worktrees/argon/windowshade-fixes diff`. Then tell me "go", and I commit in 3 commits and push to Morgan's branch

## 5. After you merge

- [ ] **The release build**: download `Argon-darwin-arm64.zip` from the 1.1.0 release (https://github.com/ChristianTabor/Argon/releases), open it (it's unsigned, so macOS makes you allow it), and check windowshade and the app icon
