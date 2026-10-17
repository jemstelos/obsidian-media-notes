/* eslint-disable @typescript-eslint/no-var-requires */
/* global document */
jest.mock("obsidian", () => ({
	Plugin: class {
		constructor(app) { this.app = app; }
	},
	PluginSettingTab: class {
		constructor(app, plugin) { this.app = app; this.plugin = plugin; }
		getControlValue(key) { return this.plugin.settings[key]; }
	},
}), { virtual: true });
jest.mock("../viewPlugin", () => ({ createClickHandlerPlugin: jest.fn() }));

const React = require("react");
const { act } = require("react-dom/test-utils");
const { createRoot } = require("react-dom/client");
const { EventEmitter } = require("events");
const MediaNotesPlugin = require("../main").default;
const { SettingsTab } = require("../settings");
const { AppProvider, useAppContext } = require("../app-context");
const manifest = require("../../manifest.json");

const createPlugin = async (saved = null) => {
	const plugin = new MediaNotesPlugin({});
	plugin.loadData = jest.fn().mockResolvedValue(saved);
	plugin.saveData = jest.fn().mockResolvedValue(undefined);
	plugin.players = {};
	await plugin.loadSettings();
	return plugin;
};

test("all 11 preferences have searchable names and descriptions without indexing playback history", async () => {
	const plugin = await createPlugin();
	const tab = new SettingsTab(plugin.app, plugin);
	const definitions = tab.getSettingDefinitions();
	expect(definitions).toHaveLength(11);
	const keys = definitions.map(({ control }) => control.key);
	expect(new Set(keys).size).toBe(11);
	expect(keys.sort()).toEqual(
		Object.keys(plugin.settings).filter((key) => key !== "mediaData").sort()
	);
	definitions.forEach((item) => {
		expect(item.name).toBeTruthy();
		expect(item.desc).toBeTruthy();
		expect(item.render).toBeUndefined();
	});
	expect(Object.hasOwnProperty.call(SettingsTab.prototype, "display")).toBe(false);
	expect(plugin.saveData).not.toHaveBeenCalled();
});

test("the host requirement is 1.13+ while upstream identity and defaults stay unchanged", async () => {
	const plugin = await createPlugin();
	expect(manifest).toMatchObject({
		id: "media-notes", name: "Media Notes", author: "jemstelos", minAppVersion: "1.13.0",
	});
	expect(plugin.settings).toMatchObject({
		defaultSplitMode: "Vertical",
		seekSeconds: 10,
		verticalPlayerHeight: 40,
		horizontalPlayerWidth: 40,
		timestampOffsetSeconds: 6,
		timestampTemplate: "[{ts}]({link})\n",
	});
});

test("slider ranges, dropdown values and template tokens retain their meaning", async () => {
	const plugin = await createPlugin();
	const controls = Object.fromEntries(new SettingsTab(plugin.app, plugin)
		.getSettingDefinitions().map(({ control }) => [control.key, control]));
	expect(controls.seekSeconds).toMatchObject({ type: "slider", min: 1, max: 60, step: 1 });
	expect(controls.verticalPlayerHeight).toMatchObject({ type: "slider", min: 5, max: 95, step: 5 });
	expect(controls.horizontalPlayerWidth).toMatchObject({ type: "slider", min: 5, max: 95, step: 5 });
	expect(controls.timestampOffsetSeconds).toMatchObject({ type: "slider", min: 0, max: 60, step: 1 });
	expect(controls.defaultSplitMode.options).toEqual({ Vertical: "Vertical", Horizontal: "Horizontal" });
	expect(controls.timestampTemplate).toMatchObject({ type: "textarea", rows: 3 });
	expect(controls.displayProgressBar.type).toBe("toggle");
	expect(controls.progressBarColor.type).toBe("color");
});

test("saved preferences and playback history seed controls without a data migration", async () => {
	const saved = {
		seekSeconds: 17,
		defaultSplitMode: "Horizontal",
		displayProgressBar: false,
		timestampTemplate: "\\n- [{ts}]({link})\n",
		mediaData: { video: { mediaLink: "https://www.youtube.com/watch?v=video", lastTimestampSeconds: 123 } },
	};
	const plugin = await createPlugin(saved);
	const tab = new SettingsTab(plugin.app, plugin);
	for (const key of ["seekSeconds", "defaultSplitMode", "displayProgressBar", "timestampTemplate"]) {
		expect(tab.getControlValue(key)).toEqual(saved[key]);
	}
	expect(plugin.settings.mediaData).toEqual(saved.mediaData);
	expect(plugin.saveData).not.toHaveBeenCalled();
});

test.each([
	["defaultSplitMode", "Horizontal"],
	["seekSeconds", 20],
	["verticalPlayerHeight", 55],
	["horizontalPlayerWidth", 65],
	["timestampOffsetSeconds", 0],
	["timestampTemplate", "\n- [{ts}]({link})\\n"],
	["backgroundColor", "#ffffff"],
	["displayProgressBar", false],
	["progressBarColor", "#123456"],
	["displayTimestamp", false],
	["pauseOnTimestampInsert", true],
])("%s changes use saveSettings and notify open players", async (key, value) => {
	const plugin = await createPlugin();
	const history = plugin.settings.mediaData;
	const previous = plugin.settings;
	const emitter = new EventEmitter();
	const listener = jest.fn();
	emitter.on("settingsUpdated", listener);
	plugin.players.video = { eventEmitter: emitter };
	const saveSettings = jest.spyOn(plugin, "saveSettings");
	const tab = new SettingsTab(plugin.app, plugin);
	await tab.setControlValue(key, value);
	expect(plugin.settings).not.toBe(previous);
	expect(plugin.settings[key]).toBe(value);
	expect(plugin.settings.mediaData).toBe(history);
	expect(saveSettings).toHaveBeenCalledTimes(1);
	expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
	expect(listener).toHaveBeenCalledWith(plugin.settings);
});

test("the custom control binding awaits persistence and surfaces write failures", async () => {
	const plugin = await createPlugin();
	const tab = new SettingsTab(plugin.app, plugin);
	let finish;
	let settled = false;
	plugin.saveData.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
	const pending = tab.setControlValue("seekSeconds", 30).then(() => { settled = true; });
	await Promise.resolve();
	expect(settled).toBe(false);
	finish();
	await pending;
	expect(settled).toBe(true);
	plugin.saveData.mockRejectedValueOnce(new Error("disk unavailable"));
	await expect(tab.setControlValue("seekSeconds", 35)).rejects.toThrow("disk unavailable");
});

test("unknown keys and playback history cannot be changed through the settings controls", async () => {
	const plugin = await createPlugin();
	const tab = new SettingsTab(plugin.app, plugin);
	const previous = plugin.settings;
	for (const key of ["mediaData", "unknown", "__proto__", "constructor"]) {
		await tab.setControlValue(key, {});
	}
	expect(plugin.settings).toBe(previous);
	expect(plugin.saveData).not.toHaveBeenCalled();
});

test("declarative updates rerender the existing React context", async () => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
	const plugin = await createPlugin();
	const emitter = new EventEmitter();
	plugin.players.video = { eventEmitter: emitter };
	const root = createRoot(document.createElement("div"));
	const values = [];
	const Display = () => {
		values.push(useAppContext().settings.displayProgressBar);
		return null;
	};
	try {
		await act(async () => root.render(React.createElement(AppProvider, {
			settingsParam: plugin.settings, eventEmitter: emitter,
		}, React.createElement(Display))));
		const tab = new SettingsTab(plugin.app, plugin);
		await act(async () => { await tab.setControlValue("displayProgressBar", false); });
		expect(values[0]).toBe(true);
		expect(values[values.length - 1]).toBe(false);
	} finally {
		act(() => root.unmount());
		emitter.removeAllListeners();
		delete global.IS_REACT_ACT_ENVIRONMENT;
	}
});
