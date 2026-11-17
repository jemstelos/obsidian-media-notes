import { createRoot, Root } from "react-dom/client";
import { MediaFrame, getVideoId } from "./components/media-frame";
import { AppProvider } from "./app-context";
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
import { createClickHandlerPlugin } from "./viewPlugin";
import { EventEmitter } from "events";

export interface MediaNotesPluginSettings {
	seekSeconds: number;
	verticalPlayerHeight: number;
	horizontalPlayerWidth: number;
	timestampTemplate: string;
	timestampOffsetSeconds: number;
	backgroundColor: string;
	progressBarColor: string;
	displayProgressBar: boolean;
	displayTimestamp: boolean;
	pauseOnTimestampInsert: boolean;
	defaultSplitMode: "Horizontal" | "Vertical";
	mediaData: {
		[id: string]: {
			mediaLink: string;
			lastUpdated: string;
			lastTimestampSeconds: number;
		};
	};
}

const DEFAULT_SETTINGS: MediaNotesPluginSettings = {
	seekSeconds: 10,
	verticalPlayerHeight: 40,
	horizontalPlayerWidth: 40,
	defaultSplitMode: "Vertical",
	pauseOnTimestampInsert: false,
	displayProgressBar: true,
	displayTimestamp: true,
	timestampOffsetSeconds: 6,
	backgroundColor: "#000000",
	progressBarColor: "#FF0000",
	timestampTemplate: "[{ts}]({link}) ",
	mediaData: {},
};

const mediaNotesContainerClass = "media-notes-container";
const mediaParentContainerVerticalClass = "media-container-parent-vertical";

export const formatTimestamp = (timestamp: number | undefined) => {
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

const getMediaLinkFromFrontmatter = (frontmatter: Record<string, string>) => {
	return frontmatter["media_link"] || frontmatter["media"];
};

// parses a url t= param ("90", "90s", "1m30s", "1h2m3s") into seconds, null if invalid
const parseTimeParam = (t: string | null) => {
	if (!t) return null;
	if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
	const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
	if (!match || !(match[1] || match[2] || match[3])) return null;
	return (
		Number(match[1] ?? 0) * 3600 +
		Number(match[2] ?? 0) * 60 +
		Number(match[3] ?? 0)
	);
};

export default class MediaNotesPlugin extends Plugin {
	settings: MediaNotesPluginSettings;

	players: {
		[id: string]: {
			ytRef: React.RefObject<YouTube>;
			mediaLink: string;
			eventEmitter: EventEmitter;
			root: Root;
		};
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
				if (typeof timestamp !== "number") return;
				const mediaId = getVideoId(player.mediaLink);
				if (!mediaId) return;
				this.settings.mediaData[mediaId] = {
					mediaLink: player.mediaLink,
					lastUpdated: new Date().toISOString(),
					lastTimestampSeconds: timestamp,
				};
				return this.saveSettings();
			})
			.catch((error: unknown) => {
				console.error("Media Notes: failed to save timestamp", error);
			});
	};

	// saves the timestamp, then unmounts the player and removes its container
	destroyPlayer = (playerId: string, playerContainer: Element) => {
		// savePlayerTimestamp requests the current time before the player is unmounted
		this.savePlayerTimestamp(playerId);
		this.players[playerId]?.root.unmount();
		delete this.players[playerId];
		playerContainer.remove();
	};

	// removes the player from a view (if any) and resets the split layout
	removePlayerFromView = (markdownView: MarkdownView) => {
		const container = markdownView.containerEl;
		const div = container.querySelector("." + mediaNotesContainerClass);
		if (div) {
			const playerId = div.getAttribute("data-player-id") ?? "";
			this.destroyPlayer(playerId, div);
		}
		container.classList.remove(mediaParentContainerVerticalClass);
	};

	renderPlayerInView = (markdownView: MarkdownView) => {
		let frontmatter: Record<string, string> = {};
		try {
			// @ts-ignore TS2339
			frontmatter = (parseYaml(markdownView.rawFrontmatter) ??
				{}) as Record<string, string>;
		} catch (e) {
			// malformed frontmatter yaml, treat as no media link
		}
		const mediaLink = getMediaLinkFromFrontmatter(frontmatter);
		// an invalid media link (not a url, not a string, no video id) is treated as no media link
		const mediaId =
			typeof mediaLink === "string" ? getVideoId(mediaLink) : null;
		const container = markdownView.containerEl;
		const markdownSourceview = container.querySelector(
			".markdown-source-view"
		);
		// if there's a media_link
		if (mediaId && markdownSourceview) {
			const existingPlayerComponent = container.querySelector(
				"." + mediaNotesContainerClass
			);

			if (existingPlayerComponent) {
				const playerId =
					existingPlayerComponent.getAttribute("data-player-id") ??
					"";
				const player = this.players[playerId];
				// If a player state object exists for this media link, don't re-render
				if (player && player.mediaLink === mediaLink) {
					return;
				}
				// remove the existing player
				this.destroyPlayer(playerId, existingPlayerComponent);
			}

			const div = document.createElement("div");
			const uniqueId =
				Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);

			div.className = mediaNotesContainerClass;
			// name is important - matches data-player-id in getActiveViewYoutubePlayer
			div.dataset.playerId = uniqueId;
			div.style.background = this.settings.backgroundColor;
			if (this.settings.defaultSplitMode === "Vertical") {
				div.style.width = this.settings.horizontalPlayerWidth + "%";
				container.classList.add(mediaParentContainerVerticalClass);
			} else {
				container.classList.remove(mediaParentContainerVerticalClass);
				div.style.height = this.settings.verticalPlayerHeight + "%";
			}

			markdownSourceview.prepend(div);

			const ytRef = React.createRef<YouTube>();
			const eventEmitter = new EventEmitter();
			const root = createRoot(div);
			this.players[uniqueId] = {
				ytRef,
				mediaLink: mediaLink,
				eventEmitter,
				root,
			};

			const mediaData =
				(mediaId && this.settings.mediaData[mediaId]) ||
				this.settings.mediaData[mediaLink];

			// extract the url param ts from the media link
			const mediaLinkUrl = new URL(mediaLink);
			const mediaLinkParams = new URLSearchParams(mediaLinkUrl.search);
			const mediaLinkSeconds = parseTimeParam(mediaLinkParams.get("t"));
			const initSeconds =
				mediaData?.lastTimestampSeconds ?? mediaLinkSeconds ?? 0;

			let autoplay = false;
			// If the initial seconds came from the mediaLink, autoplay
			if (mediaLinkSeconds !== null && initSeconds === mediaLinkSeconds) {
				autoplay = true;
			}

			root.render(
				<>
					<AppProvider
						settingsParam={this.settings}
						eventEmitter={eventEmitter}
					>
						<MediaFrame
							mediaLink={String(mediaLink)}
							ytRef={ytRef}
							initSeconds={Math.round(initSeconds)}
							autoplay={autoplay}
						/>
					</AppProvider>
				</>
			);
		} else {
			// if there's no media_link, cleanup existing players, and save timestamp
			this.removePlayerFromView(markdownView);
		}
	};

	handleTimestampClick = (timestamp: string): boolean | undefined => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		const player = this.getActiveViewYoutubePlayer(activeView);
		if (!player || !player.ytRef) return;

		const seconds = convertTimestampToSeconds(timestamp);
		player.ytRef.current?.getInternalPlayer()?.seekTo(seconds, true);
		player.eventEmitter.emit("handleAction", {
			type: "timestampClick",
		});
		return true;
	};

	async onload() {
		this.registerEditorExtension([
			createClickHandlerPlugin(this.handleTimestampClick),
		]);
		await this.loadSettings();

		this.players = {};

		this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			// deferred views (Obsidian 1.7.2+) are not MarkdownViews yet
			if (!(leaf.view instanceof MarkdownView)) return;
			this.renderPlayerInView(leaf.view);
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "insert-media-timestamp",
			name: "Insert Timestamp",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const timestamp =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (typeof timestamp !== "number") return;
				const offsetTimestamp =
					timestamp - this.settings.timestampOffsetSeconds >= 0
						? timestamp - this.settings.timestampOffsetSeconds
						: 0;
				const formattedTimestamp = formatTimestamp(offsetTimestamp);
				const timestampTemplate = this.settings.timestampTemplate;
				let timestampSnippet = timestampTemplate.replace(
					"{ts}",
					formattedTimestamp
				);
				const videoUrl =
					await player.ytRef.current?.internalPlayer?.getVideoUrl();

				// for some reason, the t= param is wrong in the videoUrl from getVidelUrl. fix it
				// fall back to the note's media link (already validated) if there's no video url
				const fixedVideoUrl = new URL(videoUrl || player.mediaLink);
				fixedVideoUrl.searchParams.set(
					"t",
					Math.floor(offsetTimestamp).toString()
				);
				timestampSnippet = timestampSnippet.replace(
					"{link}",
					`${fixedVideoUrl}`
				);
				timestampSnippet = timestampSnippet.replace(/\\n/g, "\n");
				editor.replaceSelection(timestampSnippet);
				if (this.settings.pauseOnTimestampInsert) {
					const player = this.getActiveViewYoutubePlayer(view);
					if (!player || !player.ytRef) return;
					const playerState =
						await player.ytRef.current?.internalPlayer?.getPlayerState();
					if (playerState === YouTube.PlayerState.PLAYING) {
						player.ytRef.current?.getInternalPlayer()?.pauseVideo();
						player.eventEmitter.emit("handleAction", {
							type: "pause",
						});
						return;
					}
				}
			},
		});

		this.addCommand({
			id: "toggle-play-pause",
			name: "Play/Pause",
			editorCallback: async (_editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const playerState =
					await player.ytRef.current?.internalPlayer?.getPlayerState();
				if (playerState === YouTube.PlayerState.PLAYING) {
					player.ytRef.current?.getInternalPlayer()?.pauseVideo();
					player.eventEmitter.emit("handleAction", {
						type: "pause",
					});
					return;
				}
				player.ytRef.current?.getInternalPlayer()?.playVideo();
				player.eventEmitter.emit("handleAction", {
					type: "play",
				});
			},
		});

		this.addCommand({
			id: "toggle-horizontal-view",
			name: "Toggle horizontal/vertical split",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const container = view.containerEl;
				const existingPlayer = view.containerEl.querySelector(
					"." + mediaNotesContainerClass
				) as HTMLElement;
				if (
					container.classList.contains(
						mediaParentContainerVerticalClass
					)
				) {
					if (existingPlayer) {
						existingPlayer.style.height =
							this.settings.verticalPlayerHeight + "%";
						existingPlayer.style.width = "100%";
					}
					container.classList.remove(
						mediaParentContainerVerticalClass
					);
				} else {
					if (existingPlayer) {
						existingPlayer.style.width =
							this.settings.horizontalPlayerWidth + "%";
						existingPlayer.style.height = "100%";
					}
					container.classList.add(mediaParentContainerVerticalClass);
				}
			},
		});

		this.addCommand({
			id: "seek-forward",
			name: "Fast Forward",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const currentTime =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (typeof currentTime !== "number") return;
				const newTime = currentTime + this.settings.seekSeconds;
				player.ytRef.current
					?.getInternalPlayer()
					?.seekTo(newTime, true);
				player.eventEmitter.emit("handleAction", {
					type: "seekForward",
				});
			},
		});

		this.addCommand({
			id: "seek-backwards",
			name: "Rewind",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const currentTime =
					await player.ytRef.current?.internalPlayer?.getCurrentTime();
				if (typeof currentTime !== "number") return;
				const newTime = Math.max(
					currentTime - this.settings.seekSeconds,
					0
				);
				player.ytRef.current
					?.getInternalPlayer()
					?.seekTo(newTime, true);
				player.eventEmitter.emit("handleAction", {
					type: "seekBackwards",
				});
				// player.ytRef.current?.getInternalPlayer()?.showVideoInfo();
				// TODO: this isn't working - don't think i can simulate a mousemove to the iframe
				const existingPlayer = view.containerEl.querySelector(
					".media-notes-container .youtube-iframe"
				);
				existingPlayer?.dispatchEvent(new Event("mousemove"));
			},
		});

		this.addCommand({
			id: "speed-up",
			name: "Speed up",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const internalPlayer =
					player.ytRef.current?.getInternalPlayer();
				if (!internalPlayer) return;
				const playbackRates =
					await internalPlayer.getAvailablePlaybackRates();
				const currentRate = await internalPlayer.getPlaybackRate();
				const currentRateIndex = playbackRates.indexOf(currentRate);
				const nextRateIndex =
					currentRateIndex + 1 < playbackRates.length
						? currentRateIndex + 1
						: currentRateIndex;
				const nextRate = playbackRates[nextRateIndex];
				internalPlayer.setPlaybackRate(nextRate);
				player.eventEmitter.emit("handleAction", {
					type: "setSpeed",
					speed: nextRate,
				});
			},
		});

		this.addCommand({
			id: "slow-down",
			name: "Slow down",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const player = this.getActiveViewYoutubePlayer(view);
				if (!player || !player.ytRef) return;
				const internalPlayer =
					player.ytRef.current?.getInternalPlayer();
				if (!internalPlayer) return;
				const playbackRates =
					await internalPlayer.getAvailablePlaybackRates();
				const currentRate = await internalPlayer.getPlaybackRate();
				const currentRateIndex = playbackRates.indexOf(currentRate);
				const nextRateIndex =
					currentRateIndex - 1 >= 0 ? currentRateIndex - 1 : 0;
				const nextRate = playbackRates[nextRateIndex];
				internalPlayer.setPlaybackRate(nextRate);
				player.eventEmitter.emit("handleAction", {
					type: "setSpeed",
					speed: nextRate,
				});
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!markdownView) {
					// since we don't have the view anymore, trigger a save on all the players in state
					Object.keys(this.players).forEach((id) => {
						this.savePlayerTimestamp(id);
					});
				}
				this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
					if (!(leaf.view instanceof MarkdownView)) return;
					this.renderPlayerInView(leaf.view);
				});
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// re-render the views of the changed file, which also cleans up if the media link was removed
				this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
					if (!(leaf.view instanceof MarkdownView)) return;
					if (leaf.view.file !== file) return;
					this.renderPlayerInView(leaf.view);
				});
			})
		);

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
		// cleanup the players in all views, and save their timestamps (also for development hot reloading)
		this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			this.removePlayerFromView(leaf.view);
		});
		// unmount any players whose view is already gone
		Object.values(this.players ?? {}).forEach((player) => {
			player.root.unmount();
		});
		this.players = {};
	}

	async loadSettings() {
		// mediaData gets its own object so DEFAULT_SETTINGS is never mutated
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			{ mediaData: {} },
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		Object.values(this.players).forEach((player) => {
			player.eventEmitter.emit("settingsUpdated", this.settings);
		});
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: MediaNotesPlugin;

	constructor(app: App, plugin: MediaNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Default split view")
			.setDesc(
				"Vertical or horizontal split view. Defaults to vertical."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						Vertical: "Vertical",
						Horizontal: "Horizontal",
					})
					.setValue(this.plugin.settings.defaultSplitMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultSplitMode = value as
							| "Vertical"
							| "Horizontal";
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Rewind & fast forward seconds")
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
			.setName("Player height (%) in horizontal-split mode")
			.setDesc(
				"The height of the player as a percentage of the viewport in horizontal-split mode."
			)
			.addSlider((slider) =>
				slider
					.setLimits(5, 95, 5)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.verticalPlayerHeight)
					.onChange(async (value) => {
						this.plugin.settings.verticalPlayerHeight = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Player width (%) in vertical-split mode")
			.setDesc(
				"The width of the player as a percentage of the viewport in vertical-split mode."
			)
			.addSlider((slider) =>
				slider
					.setLimits(5, 95, 5)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.horizontalPlayerWidth)
					.onChange(async (value) => {
						this.plugin.settings.horizontalPlayerWidth = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Timestamp offset seconds")
			.setDesc(
				"Number of seconds in the past to offset by when inserting the timestamp."
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
			.setName("Timestamp template")
			.setDesc(
				"Markdown template for inserted timestamp. Variables: {ts} is timestamp, {link} is a timestamped url, \\n is new line. Example: \\n- [{ts}]({link}) "
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
			.setName("Video player background")
			.setDesc(
				"Background color for the video player. e.g #dddddd or rgba(0, 0, 0, 0.8)"
			)
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.backgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.backgroundColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show progress bar")
			.setDesc("Display a progress bar for the elapsed time")
			.addToggle((val) =>
				val
					.setValue(this.plugin.settings.displayProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.displayProgressBar = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Progress bar color")
			.setDesc("Color of the progress bar below the video")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.progressBarColor)
					.onChange(async (value) => {
						this.plugin.settings.progressBarColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Always display current timestamp")
			.setDesc(
				"Always display the current timestamp. Default behavior is to only show it when seeking."
			)
			.addToggle((val) =>
				val
					.setValue(this.plugin.settings.displayTimestamp)
					.onChange(async (value) => {
						this.plugin.settings.displayTimestamp = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pause media when inserting timestamp")
			.setDesc(
				"If enabled, the media will pause when a timestamp is inserted"
			)
			.addToggle((val) =>
				val
					.setValue(this.plugin.settings.pauseOnTimestampInsert)
					.onChange(async (value) => {
						this.plugin.settings.pauseOnTimestampInsert = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
