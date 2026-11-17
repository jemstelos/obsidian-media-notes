# Obsidian Media Notes

<a href="https://obsidian.md/plugins?id=media-notes"><img src="https://img.shields.io/badge/media_notes-v1.3-6c31e3?logo=obsidian&style=for-the-badge"></a><br>

A best-in-class video note-taking experience in Obsidian.

Seamlessly capture and replay insights from YouTube videos, podcasts, and lectures into your knowledge base.

-   **One-Click Save** - Instantly save from YouTube to Obsidian media note
-   **Media Hotkeys** - Pause and skip forward/back while staying in your note
-   **Timestamps** - Insert clickable timestamp links to jump back to key moments
-   **Resume Playback** - Resume videos from where you left off

<div style="margin: 0 auto;">
  <img src="images/media-notes.gif">
</div>

## Create Media Note

Create media notes instantly from a Youtube page using the provided bookmarklet (instructions [here](https://obsidian-media-notes.netlify.app/)).

This lets you click a button in your browser bar and automatically create a note for the YouTube video you're watching while continuing playback from the current location.

You can turn any Obsidian note into a media note by using the `Add file property` command, then typing in `media_link` and pasting the URL.

## Media Controls

Setup hotkeys to allow you to control the playback of the media you're taking notes on without leaving your note.

Hotkeys can be setup however you like through the Hotkeys settings page.
Suggestion hotkeys for Mac users that mirror YouTube's hotkey layout:
⌃J - Rewind
⌃K - Play/Pause
⌃L - Fast Forward
⌃I - Insert Timestamp

Other commands: `Speed up`, `Slow down` and `Toggle horizontal/vertical split`. Rewind and Fast Forward move by the `Rewind & fast forward seconds` setting.

## Inserting Timestamps

Timestamps can be inserted for the current time in the video with a hotkey.

Clicking links that have the timestamp format (`HH:MM:SS`) will jump the playback time for the note's media player to that timestamp.

## Settings

Customize the viewing and note-taking experience with settings:

-   Vertical/Horizontal Player Mode - this sets the default viewing behavior, you can still toggle the mode for any given note
-   Player Size
-   Progress Bar Visibility + Color
-   Timestamp offset - you typically want to make a note on a point that was made a few seconds in the past
-   Timestamp template - you may want to insert timestamps with a space at the end or the beginning, depending on your workflow

## Format

A media note is just a markdown note with a `media_link` [property](https://help.obsidian.md/Editing+and+formatting/Properties) that contains a supported URL format. For example:

```
---
media_link: https://www.youtube.com/watch?v=MFXWY8TqSWw
---

[02:01]() - A useful insight, ties to my thought that [[Connections are key to creativity.]]
```

Supported URL formats:

-   `https://www.youtube.com/watch?v=<id>`
-   `https://youtu.be/<id>`
-   `https://www.youtube.com/shorts/<id>`
-   `https://www.youtube.com/embed/<id>`
-   `https://www.youtube.com/live/<id>`

The legacy `media` property is read when `media_link` is empty or missing. A link without a video id shows no player.

A `t=` parameter sets the start time. It accepts seconds (`t=90`) or `90s`, `1m30s` and `1h2m3s`. If the note has no saved position, playback starts at `t=` and autoplays. Otherwise it resumes from the saved position.

Media notes display an embedded player fixed in the note pane, so that the note content can be scrolled while viewing the player. The player is added to the editor view, so it does not appear in Reading view.

Timestamps are inserted into the note as markdown links with a timestamp format:
`[3:05:53]()`

Clicking links that have the timestamp format (`HH:MM:SS`) will jump the playback time for the note's media player to that timestamp.

## Installation

<a href="https://obsidian.md/plugins?id=media-notes"><img src="https://img.shields.io/badge/Install_now-6c31e3?logo=obsidian"></a><br>
Search "Media Notes" in the Obsidian Community Plugins library to find this plugin and add it.

### Manual installation / building from source

Cloning the repo into `<vault>/.obsidian/plugins/` is not enough, because `main.js` is not committed. Either:

-   Run `npm install` and `npm run build` in the cloned folder, then enable the plugin in Community plugins.
-   Download `main.js`, `manifest.json` and `styles.css` from a GitHub release into `<vault>/.obsidian/plugins/media-notes/`, then enable the plugin.

## Roadmap

-   [x] Speed controls
-   [x] Pause when inserting timestamp
-   [ ] Support jumping to timestamp links using keyboard shortcuts (e.g alt+enter)
-   [ ] Support for jumping to timestamp link via https://github.com/mrjackphil/obsidian-jump-to-link
-   [ ] Drag to resize media player frame
-   [ ] Hotkey to toggle focus onto video and use YouTube hotkeys
-   [ ] Support for other media content providers

If you'd like to provide feedback or suggestions for improvements, please use this [form](https://forms.gle/6DK61u5XMfAKwwwp9).

Recent Updates

-   Improve bookmarklet to pause YouTube video and resume from the same spot in Obsidian
-   Support newlines and YouTube url in timestamp templates

## Support

If you receive value from this plugin and would like to support the work, please consider making a donation!

<a href="https://www.buymeacoffee.com/jemstelos"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=❤️&slug=jemstelos&button_colour=5F7FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" /></a>
