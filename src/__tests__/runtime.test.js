/* eslint-disable @typescript-eslint/no-var-requires */
/* global document */
jest.mock("obsidian", () => ({
	Plugin: class {
		constructor(app) { this.app = app; }
	},
	PluginSettingTab: class {},
	MarkdownView: class {},
}), { virtual: true });
jest.mock("../viewPlugin", () => ({ createClickHandlerPlugin: jest.fn() }));
jest.mock("react-dom/client", () => ({
	createRoot: jest.fn(() => ({ render: jest.fn(), unmount: jest.fn() })),
}));

const MediaNotesPlugin = require("../main").default;
const { createRoot } = require("react-dom/client");
const { EventEmitter } = require("../event-emitter");

const createPlugin = async () => {
	const handlers = {};
	let ready;
	const plugin = new MediaNotesPlugin({
		workspace: {
			getLeavesOfType: jest.fn(() => []),
			getActiveViewOfType: () => null,
			onLayoutReady: (callback) => { ready = callback; },
			on: (event, callback) => { handlers[event] = callback; },
		},
		metadataCache: {
			getFileCache: jest.fn(() => null),
			on: (event, callback) => { handlers[event] = callback; },
		},
	});
	plugin.loadData = jest.fn().mockResolvedValue(null);
	plugin.saveData = jest.fn().mockResolvedValue(undefined);
	plugin.registerEvent = jest.fn();
	plugin.registerEditorExtension = jest.fn();
	plugin.addCommand = jest.fn();
	plugin.addSettingTab = jest.fn();
	await plugin.loadSettings();
	return { plugin, handlers, runLayoutReady: () => ready() };
};

const createView = () => {
	const containerEl = document.createElement("div");
	containerEl.innerHTML = '<div class="markdown-source-view"></div>';
	document.body.append(containerEl);
	return { containerEl, file: { path: "media.md" } };
};

const addPlayer = (plugin, id, timestamp = 12) => {
	const view = createView();
	view.containerEl.classList.add("media-container-parent-vertical");
	const container = document.createElement("div");
	container.className = "media-notes-container";
	container.dataset.playerId = id;
	view.containerEl.querySelector(".markdown-source-view").append(container);
	const player = {
		ytRef: { current: { internalPlayer: { getCurrentTime: jest.fn().mockResolvedValue(timestamp) } } },
		mediaLink: `https://www.youtube.com/watch?v=${id}`,
		root: { unmount: jest.fn() },
		eventEmitter: new EventEmitter(),
		container,
		viewContainer: view.containerEl,
	};
	plugin.players[id] = player;
	return { player, view };
};

afterEach(() => {
	document.body.innerHTML = "";
	document.getElementById("media-notes-referrer-policy")?.remove();
	jest.clearAllMocks();
});

test("startup waits for layout readiness and uses cached frontmatter, not rawFrontmatter", async () => {
	const { plugin, runLayoutReady } = await createPlugin();
	const view = createView();
	Object.defineProperty(view, "rawFrontmatter", {
		get: () => { throw new Error("Internal property must not be read"); },
	});
	plugin.app.workspace.getLeavesOfType.mockReturnValue([{ view }]);
	plugin.app.metadataCache.getFileCache.mockReturnValue({
		frontmatter: { media_link: "https://www.youtube.com/watch?v=video" },
	});
	await plugin.onload();
	expect(createRoot).not.toHaveBeenCalled();
	runLayoutReady();
	expect(createRoot).toHaveBeenCalledTimes(1);
	expect(Object.values(plugin.players)[0].mediaLink).toContain("v=video");
	expect(document.querySelector('meta[name="referrer"]').content).toBe("strict-origin-when-cross-origin");
	plugin.onunload();
});

test.each([null, {}, { media_link: 42 }, { media_link: "not a URL" }])(
	"missing or invalid cached media data cannot crash startup: %j",
	async (frontmatter) => {
		const { plugin, runLayoutReady } = await createPlugin();
		plugin.app.workspace.getLeavesOfType.mockReturnValue([{ view: createView() }]);
		plugin.app.metadataCache.getFileCache.mockReturnValue({ frontmatter });
		await plugin.onload();
		expect(runLayoutReady).not.toThrow();
		expect(createRoot).not.toHaveBeenCalled();
	}
);

test("changing or removing media unmounts the previous React root", async () => {
	const { plugin } = await createPlugin();
	const view = createView();
	let frontmatter = { media_link: "https://www.youtube.com/watch?v=first" };
	plugin.app.metadataCache.getFileCache.mockImplementation(() => ({ frontmatter }));
	plugin.renderPlayerInView(view);
	const first = Object.values(plugin.players)[0];
	plugin.renderPlayerInView(view);
	expect(createRoot).toHaveBeenCalledTimes(1);
	frontmatter = { media_link: "https://www.youtube.com/watch?v=second" };
	plugin.renderPlayerInView(view);
	expect(first.root.unmount).toHaveBeenCalledTimes(1);
	const second = Object.values(plugin.players)[0];
	frontmatter = {};
	plugin.renderPlayerInView(view);
	expect(second.root.unmount).toHaveBeenCalledTimes(1);
	expect(plugin.players).toEqual({});
	expect(view.containerEl.classList.contains("media-container-parent-vertical")).toBe(false);
});

test("unloading before layout is ready prevents a delayed callback recreating players", async () => {
	const { plugin, runLayoutReady } = await createPlugin();
	plugin.app.workspace.getLeavesOfType.mockReturnValue([{ view: createView() }]);
	plugin.app.metadataCache.getFileCache.mockReturnValue({
		frontmatter: { media_link: "https://www.youtube.com/watch?v=video" },
	});
	await plugin.onload();
	plugin.onunload();
	runLayoutReady();
	expect(createRoot).not.toHaveBeenCalled();
});

test("a note whose cache arrives after layout readiness gets its player on metadata change", async () => {
	const { plugin, handlers, runLayoutReady } = await createPlugin();
	const view = createView();
	plugin.app.workspace.getLeavesOfType.mockReturnValue([{ view }]);
	await plugin.onload();
	runLayoutReady();
	expect(createRoot).not.toHaveBeenCalled();
	plugin.app.metadataCache.getFileCache.mockReturnValue({
		frontmatter: { media: "https://www.youtube.com/watch?v=video" },
	});
	handlers.changed(view.file);
	expect(createRoot).toHaveBeenCalledTimes(1);
	plugin.onunload();
});

test("metadata updates refresh all views of the affected note, including property removal", async () => {
	const { plugin, handlers } = await createPlugin();
	await plugin.onload();
	const view = createView();
	const duplicate = { ...view };
	const other = createView();
	plugin.app.workspace.getLeavesOfType.mockReturnValue([
		{ view }, { view: duplicate }, { view: other },
	]);
	plugin.renderPlayerInView = jest.fn();
	handlers.changed(view.file);
	expect(plugin.renderPlayerInView.mock.calls).toEqual([[view], [duplicate]]);
});

test("closing a pane and unloading with no active view clean up all roots", async () => {
	const { plugin, handlers } = await createPlugin();
	await plugin.onload();
	const { player: closed } = addPlayer(plugin, "closed");
	closed.viewContainer.remove();
	handlers["layout-change"]();
	expect(closed.root.unmount).toHaveBeenCalledTimes(1);
	const { player: first } = addPlayer(plugin, "first");
	const { player: second } = addPlayer(plugin, "second");
	first.root.unmount.mockImplementation(() => {
		expect(first.ytRef.current.internalPlayer.getCurrentTime).toHaveBeenCalled();
	});
	plugin.onunload();
	expect(first.root.unmount).toHaveBeenCalledTimes(1);
	expect(second.root.unmount).toHaveBeenCalledTimes(1);
	expect(first.container.isConnected).toBe(false);
	expect(plugin.players).toEqual({});
	await Promise.resolve();
	await plugin.saveSettings();
	expect(Object.keys(plugin.settings.mediaData).sort()).toEqual(["closed", "first", "second"]);
});

test("playback saving accepts zero and never reloads stale preferences", async () => {
	const { plugin } = await createPlugin();
	addPlayer(plugin, "video", 0);
	plugin.loadData.mockClear();
	await plugin.savePlayerTimestamp("video");
	expect(plugin.settings.mediaData.video.lastTimestampSeconds).toBe(0);
	expect(plugin.loadData).not.toHaveBeenCalled();
	expect(plugin.saveData).toHaveBeenCalledTimes(1);
});

test("preference writes serialize snapshots and broadcast fresh state before disk finishes", async () => {
	const { plugin } = await createPlugin();
	const { player } = addPlayer(plugin, "video");
	const listener = jest.fn();
	player.eventEmitter.on("settingsUpdated", listener);
	let finishFirst;
	plugin.saveData.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
	plugin.settings.mediaData.video = { lastTimestampSeconds: 1 };
	const first = plugin.saveSettings();
	plugin.settings.seekSeconds = 25;
	plugin.settings.mediaData.video = { lastTimestampSeconds: 2 };
	const second = plugin.saveSettings();
	expect(listener).toHaveBeenCalledTimes(2);
	expect(listener.mock.calls[0][0]).not.toBe(plugin.settings);
	await Promise.resolve();
	expect(plugin.saveData).toHaveBeenCalledTimes(1);
	expect(plugin.saveData.mock.calls[0][0]).toMatchObject({
		seekSeconds: 10, mediaData: { video: { lastTimestampSeconds: 1 } },
	});
	finishFirst();
	await Promise.all([first, second]);
	expect(plugin.saveData.mock.calls[1][0]).toMatchObject({
		seekSeconds: 25, mediaData: { video: { lastTimestampSeconds: 2 } },
	});
});

test("a failed write does not block subsequent saves", async () => {
	const { plugin } = await createPlugin();
	plugin.saveData.mockRejectedValueOnce(new Error("disk unavailable"));
	await expect(plugin.saveSettings()).rejects.toThrow("disk unavailable");
	await expect(plugin.saveSettings()).resolves.toBeUndefined();
});

test("new plugin instances do not share default playback history", async () => {
	const { plugin: first } = await createPlugin();
	first.settings.mediaData.video = { lastTimestampSeconds: 12 };
	const { plugin: second } = await createPlugin();
	expect(second.settings.mediaData).toEqual({});
	expect(second.settings.defaultSplitMode).toBe("Vertical");
});
