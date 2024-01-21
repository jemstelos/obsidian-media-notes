# Obsidian Media Notes
This plugin aims to provide a best-in-class experience for audio and video note-taking. 

Capture and replay the best insights from podcasts and lecture on YouTube, integrated directly into your second brain. 

- **Media Control Hotkeys** - Pause and skip forward/back without breaking your notetaking flow
- **Embedded Timestamps** - Insert clickable timestamp links to jump back to key moments
- **Resume Playback** - Come back later and pick up from wherever you left off
- **Focused Learning Environment** - Take video notes surrounded by your knowledge, not a content feed

TODO: IMAGE GIF
## Installation
This is a community plugin for Obsidian. Read more about how installing and using Obsidian Plugins [here](https://help.obsidian.md/Extending+Obsidian/Community+plugins).
Search "Media Notes" in the Community Plugins library to locate this plugin and add it.

## Documentation
A media note is just a markdown note with a  `media_link` property that contains a supported URL format (e.g  a YouTube link).

```
---
  media_link: https://www.youtube.com/watch?v=MFXWY8TqSWw
---

[02:01]() - A useful insight, ties to my thought that [[Connections are key to creativity.]]
```

Media notes display an embedded player fixed in the note pane, so that the note content can be scrolled while viewing the player.

Timestamps are inserted into the note as markdown links with a timestamp format:
`[3:05:53]()`

Clicking links that have the timestamp format (`HH:MM:SS`) will jump the playback time for the note's media player to that timestamp.

## Usage

### Create a media note
A media note is just a markdown note with a valid `media_link` property.

The simplest way to turn a note into a media note is to use the `Add file property` command, then type in `media_link` and paste your URL:

More advanced users may want to create a Templater template for media notes that prompts for the meda_link URL.

### One-Click Media Note from YouTube
For a smoother workflow to create media notes from a Youtube page in your browser, you can use the following bookmarklet.

A bookmarklet is a browser bookmark that runs a code snippet. In this case, it takes the url and title of the current page and constructs a URI link for Obsidian's create note method. The note created has the media_link already inserted, and the page title in the note title.

### Media Controls
One of the main benefits of this plugin is the ability to assign hotkeys to media controls, so that you can control the playback of the content you're taking notes on without leaving your note.

- Play/Pause
- Seek Forward
- Seek Backward

Media controls can be bound to any hotkey you like through the Hotkeys settings page.

### Inserting and using Timestamps
Timestamps can be inserted using the `Insert Timestamp` command, which can be bound to a hotkey for seamlessly capturing important snippets. An offset is configurable as you typically want to make a note on a point that was made a few seconds in the past.

Clicking links that have the timestamp format (`HH:MM:SS`) will jump the playback time for the note's media player to that timestamp.

## Settings
A number of settings are provided for you to customize the viewing and note-taking experience, including:

- Vertical/Horizontal Player Mode  - this sets the default viewing behavior, you can still toggle the mode for any given note
- Player Size 
- Progress Bar Visibility + Color
- Timestamp offset - you typically want to make a note on a point that was made a few seconds in the past
- Timestamp template - you may want to insert timestamps with a space at the end or the beginning, depending on your workflow

## Roadmap
- [ ] Support jumping to timestamp links using keyboard shortcuts (e.g alt+enter)
- [ ] Support for jumping to timestamp link via 
- [ ] Drag to resize media player frame

## Support
If you receive value from this plugin and would like to support the work as well as its continued future development, please consider contributing a donation:

<a href="https://www.buymeacoffee.com/jemstelos"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=❤️&slug=jemstelos&button_colour=5F7FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" /></a>
