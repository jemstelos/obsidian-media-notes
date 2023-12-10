import { createRoot } from "react-dom/client";
import { MediaFrame } from "./components/media-frame";
import { StrictMode } from "react";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
	parseYaml,
} from "obsidian";
import * as React from "react";
import YouTube from "react-youtube";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

const formatTimestamp = (timestamp: number | undefined) => {
	if (timestamp === undefined) return "";
	const hours = Math.floor(timestamp / 3600);
	const minutes = Math.floor((timestamp - hours * 3600) / 60);
	const seconds = Math.floor(timestamp - hours * 3600 - minutes * 60);
	const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
	return `${hours > 0 ? hours + ":" : ""}${minutes}:${formattedSeconds}`;
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	players: { [id: string]: { ytRef: React.Ref<YouTube> } };

	async onload() {
		await this.loadSettings();

		this.players = {};

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "insert-media-timestamp",
			name: "Insert Media Timestamp",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log("we in herez");
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				const existingPlayer = markdownView?.containerEl.querySelector(
					"#media-notes-container"
				);
				if (!existingPlayer) return;
				const playerId =
					existingPlayer.getAttribute("data-player-id") ?? "";
				const player = this.players[playerId];
				if (!player || !player.ytRef) return;
				const timestamp =
					await player.ytRef.current?.internalPlayer.getCurrentTime();
				editor.replaceSelection(formatTimestamp(timestamp));
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "focus-media-frame",
			name: "Focus Media Frame",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (view) {
					const container = view.containerEl;
					const existingPlayer = container.querySelector(
						"#media-notes-container iframe"
					);
					console.log(existingPlayer);
					existingPlayer.contentWindow?.focus();
				}
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
				console.log("layout changeD");
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					const frontmatter = (parseYaml(
						markdownView.rawFrontmatter
					) ?? {}) as Record<string, unknown>;
					if (frontmatter && frontmatter["media_link"]) {
						const container = markdownView.containerEl;
						const existingPlayer = container.querySelector(
							"#media-notes-container"
						);
						// TODO: check if player is for current note, if it isn't replace
						if (existingPlayer) return;

						const div = document.createElement("div");
						const uniqueId =
							Math.random().toString(36).substring(2, 15) +
							Math.random().toString(36).substring(2, 15);

						div.id = "media-notes-container";
						div.dataset.playerId = uniqueId;
						div.style.height = "250px";
						const markdownSourceview = container.querySelector(
							".markdown-source-view"
						);
						if (!markdownSourceview) return;
						markdownSourceview.prepend(div);

						const ytRef = React.createRef<YouTube>();

						this.players[uniqueId] = { ytRef };

						const root = createRoot(div);
						root.render(
							<StrictMode>
								<MediaFrame
									mediaLink={String(
										frontmatter["media_link"]
									)}
									ytRef={ytRef}
								/>
							</StrictMode>
						);
					} else {
						const container = markdownView.containerEl;
						const div = container.querySelector(
							"#media-notes-container"
						);
						if (div) {
							div.remove();
						}
					}
				}
			})
		);
		this.app.workspace.onLayoutReady(() => {
			console.log("layout ready");
		});
		// this.registerEditorExtension([examplePlugin, exampleField]);
	}

	onunload() {}

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
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
