import { createRoot } from "react-dom/client";
import { MediaFrame } from "./components/media-frame";
import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	View,
	parseYaml,
} from "obsidian";
import * as React from "react";
import YouTube from "react-youtube";
import { createClickHandlerPlugin } from "viewPlugin";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	seekSeconds: number;
	playerSize: number;
	timestampTemplate: string;
	timestampOffsetSeconds: number;
	backgroundColor: string;
	defaultViewHorizontal: boolean;
	mediaData: {
		[id: string]: {
			mediaLink: string;
			lastUpdated: string;
			lastTimestampSeconds: number;
		};
	};
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	seekSeconds: 10,
	playerSize: 25,
	defaultViewHorizontal: false,
	timestampOffsetSeconds: 5,
	backgroundColor: "#000000",
	timestampTemplate: "[{ts}]() ",
	mediaData: {},
};

const mediaNotesContainerClass = "media-notes-container";
const mediaParentContainerHorizontalClass = "media-container-parent-horizontal";

const formatTimestamp = (timestamp: number | undefined) => {
	if (timestamp === undefined) return "";
	const hours = Math.floor(timestamp / 3600);
	const minutes = Math.floor((timestamp - hours * 3600) / 60);
	const seconds = Math.floor(timestamp - hours * 3600 - minutes * 60);
	const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
	const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
	return `${
		hours > 0 ? hours + ":" : ""
	}${formattedMinutes}:${formattedSeconds}`;
};

const convertTimestampToSeconds = (timestamp: string) => {
	const timestampParts = timestamp.split(":").map(Number);
	let seconds = 0;
	if (timestampParts.length === 3) {
		seconds += timestampParts[0] * 3600;
		seconds += timestampParts[1] * 60;
		seconds += timestampParts[2];
	} else if (timestampParts.length === 2) {
		seconds += timestampParts[0] * 60;
		seconds += timestampParts[1];
	} else {
		seconds += timestampParts[0];
	}
	return seconds;
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	players: {
		[id: string]: { ytRef: React.RefObject<YouTube>; mediaLink: string };
	};

	getActiveViewYoutubePlayer = (view: View) => {
		// const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		const existingPlayer = view.containerEl.querySelector(
			"." + mediaNotesContainerClass
		);
		if (!existingPlayer) return;
		const playerId = existingPlayer.getAttribute("data-player-id") ?? "";
		const player = this.players[playerId];
		if (!player) return null;
		return player;
	};

	// saves the timestamp of the player into settings, by media link
	savePlayerTimestamp = (playerId: string) => {
		const player = this.players[playerId];
		if (!player) return;
		player.ytRef.current?.internalPlayer
			?.getCurrentTime()
			.then((timestamp: number) => {
				this.settings.mediaData[player.mediaLink] = {
					mediaLink: player.mediaLink,
					lastUpdated: new Date().toISOString(),
					lastTimestampSeconds: timestamp,
				};
				this.saveSettings();
				this.loadSettings();
			});
	};

	renderPlayerInView = (markdownView: MarkdownView) => {
		const frontmatter = (parseYaml(markdownView.rawFrontmatter) ??
			{}) as Record<string, string>;
		if (frontmatter && frontmatter["media_link"]) {
			const container = markdownView.containerEl;
			const existingPlayerComponent = container.querySelector(
				"." + mediaNotesContainerClass
			);

			if (existingPlayerComponent) {
				const playerId =
					existingPlayerComponent.getAttribute("data-player-id") ??
					"";
				const player = this.players[playerId];
				// If a player state object exists for this media link, don't re-render
				if (player && player.mediaLink === frontmatter["media_link"]) {
					return;
				}
				// remove the existing player
				existingPlayerComponent.remove();
				this.savePlayerTimestamp(playerId);
				delete this.players[playerId];
			}

			const div = document.createElement("div");
			const uniqueId =
				Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);

			div.className = mediaNotesContainerClass;
			// name is important - matches data-player-id in getActiveViewYoutubePlayer
			div.dataset.playerId = uniqueId;
			// div.style.height = this.settings.playerSize + "%";
			div.style.background = this.settings.backgroundColor;
			const markdownSourceview = container.querySelector(
				".markdown-source-view"
			);
			if (this.settings.defaultViewHorizontal) {
				container.className +=
					" " + mediaParentContainerHorizontalClass;
				debugger;
			}

			if (!markdownSourceview) return;
			markdownSourceview.prepend(div);

			const mediaLink = frontmatter["media_link"];
			const ytRef = React.createRef<YouTube>();
			this.players[uniqueId] = {
				ytRef,
				mediaLink: mediaLink,
			};

			// media data is indexed by media link
			const mediaData = this.settings.mediaData[mediaLink];
			const initSeconds = mediaData?.lastTimestampSeconds ?? undefined;

			const root = createRoot(div);
			root.render(
				<>
					<MediaFrame
						mediaLink={String(mediaLink)}
						ytRef={ytRef}
						initSeconds={Math.round(initSeconds)}
					/>
				</>
			);
		} else {
			const container = markdownView.containerEl;
			// cleanup existing players, and save timestamp
			const div = container.querySelector(mediaNotesContainerClass);
			if (div) {
				// unmount
				const playerId = div.getAttribute("data-player-id") ?? "";
				this.savePlayerTimestamp(playerId);
				delete this.players[playerId];
				div.remove();
			}
		}
	};

	handleTimestampClick = (timestamp: string): boolean | undefined => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		const player = this.getActiveViewYoutubePlayer(activeView);
		if (!player || !player.ytRef) return;

		const seconds = convertTimestampToSeconds(timestamp);
		player.ytRef.current?.getInternalPlayer()?.seekTo(seconds, true);
		return true;
	};

	async onload() {
		this.registerEditorExtension([
			createClickHandlerPlugin(this.handleTimestampClick),
		]);
		await this.loadSettings();

		this.players = {};

		this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			console.log("leaf!", leaf);
			const view = leaf.view as MarkdownView;
			this.renderPlayerInView(view);
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "mn-insert-media-timestamp",
			name: "Insert Timestamp",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const timestamp =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (!timestamp) return;
				const offsetTimestamp =
					timestamp - this.settings.timestampOffsetSeconds >= 0
						? timestamp - this.settings.timestampOffsetSeconds
						: 0;
				const formattedTimestamp = formatTimestamp(offsetTimestamp);
				const timestampTemplate = this.settings.timestampTemplate;
				const timestampSnippet = timestampTemplate.replace(
					"{ts}",
					formattedTimestamp
				);
				editor.replaceSelection(timestampSnippet);
			},
		});

		this.addCommand({
			id: "mn-toggle-play-pause",
			name: "Play/Pause",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const playerState =
					await player.ytRef.current?.internalPlayer?.getPlayerState();
				if (playerState === YouTube.PlayerState.PLAYING) {
					player.ytRef.current?.getInternalPlayer()?.pauseVideo();
					return;
				}
				player.ytRef.current?.getInternalPlayer()?.playVideo();
			},
		});

		this.addCommand({
			id: "mn-toggle-horizontal-view",
			name: "Toggle horizontal/vertical",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				console.log("toggle horizontal view");
				const container = view.containerEl;
				if (
					container.classList.contains(
						mediaParentContainerHorizontalClass
					)
				) {
					container.classList.remove(
						mediaParentContainerHorizontalClass
					);
				} else {
					container.classList.add(
						mediaParentContainerHorizontalClass
					);
				}
			},
		});

		this.addCommand({
			id: "mn-seek-forward",
			name: "Fast Forward",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const currentTime =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (!currentTime) return;
				const newTime = currentTime + this.settings.seekSeconds;
				player.ytRef.current
					?.getInternalPlayer()
					?.seekTo(newTime, true);
			},
		});

		this.addCommand({
			id: "mn-seek-backwards",
			name: "Rewind",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const currentTime =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (!currentTime) return;
				const newTime = currentTime - this.settings.seekSeconds;
				player.ytRef.current
					?.getInternalPlayer()
					?.seekTo(newTime, true);
				// TODO: this isn't working - don't think i can simulate a mousemove to the iframe
				const existingPlayer = view.containerEl.querySelector(
					"#media-notes-container .youtube-iframe"
				);
				existingPlayer?.dispatchEvent(new Event("mousemove"));
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "load", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				console.log("layout changed");
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!markdownView) return;
				this.renderPlayerInView(markdownView);
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				const frontmatter =
					this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (frontmatter && "media_link" in frontmatter) {
					// technically this may not be the same view as the file that changed
					const markdownView =
						this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!markdownView) return;
					this.renderPlayerInView(markdownView);
				}
			})
		);

		this.app.workspace.onLayoutReady(() => {
			console.log("layout ready");
		});

		// TODO: this doesn't work yet, its for Reading mode
		// this.registerMarkdownPostProcessor(
		// 	(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		// 		el.querySelectorAll(".external-link").forEach(
		// 			(link: HTMLAnchorElement) => {
		// 				link.addEventListener("click", (event: MouseEvent) => {
		// 					event.preventDefault();
		// 					// Your custom logic here
		// 					console.log(
		// 						"Intercepted cm-link click:",
		// 						link.href
		// 					);
		// 				});
		// 			}
		// 		);
		// 	}
		// );
	}

	onunload() {
		console.log("unloading!");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Rewind & Fast Forward Seconds")
			.setDesc("Number of seconds to rewind/fast forward")
			.addSlider((slider) =>
				slider
					.setLimits(1, 60, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.seekSeconds)
					.onChange(async (value) => {
						this.plugin.settings.seekSeconds = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Player Size (%)")
			.setDesc(
				"The height or width of the player as a percentage of the viewport"
			)
			.addSlider((slider) =>
				slider
					.setLimits(5, 95, 5)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.playerSize)
					.onChange(async (value) => {
						this.plugin.settings.playerSize = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Timestamp offset seconds")
			.setDesc(
				"Number of seconds in the past to offset the timestamp by."
			)
			.addSlider((slider) =>
				slider
					.setLimits(0, 60, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.timestampOffsetSeconds)
					.onChange(async (value) => {
						this.plugin.settings.timestampOffsetSeconds = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Insert Timestamp Template")
			.setDesc(
				"The template used for inserting the timestamp with the 'Insert Timestamp' command. Use '{ts}' as a placeholder for the timestamp."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timestampTemplate)
					.onChange(async (value) => {
						this.plugin.settings.timestampTemplate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Video Player Background")
			.setDesc(
				"Background color for the video player. e.g #dddddd or rgba(0, 0, 0, 0.8)"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.backgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.backgroundColor = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
