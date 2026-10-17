/* eslint-disable @typescript-eslint/no-var-requires */
/* global document */
const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = require("react-dom/test-utils");
const { AppProvider, useAppContext } = require("../app-context");
const { EventEmitter } = require("../event-emitter");

test.each([false, true])("settings rerender and unmount clears listeners/timers (pending action: %s)", (pending) => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
	jest.useFakeTimers();
	const container = document.createElement("div");
	const root = createRoot(container);
	const emitter = new EventEmitter();
	const off = jest.spyOn(emitter, "off");
	const on = jest.spyOn(emitter, "on");
	const settings = { displayProgressBar: true };
	const Display = () => React.createElement("span", null, String(useAppContext().settings.displayProgressBar));
	try {
		act(() => root.render(React.createElement(AppProvider, {
			settingsParam: settings, eventEmitter: emitter,
		}, React.createElement(Display))));
		expect(container.textContent).toBe("true");
		act(() => {
			settings.displayProgressBar = false;
			emitter.emit("settingsUpdated", settings);
			emitter.emit("handleAction", { type: "play" });
		});
		expect(container.textContent).toBe("false");
		if (!pending) act(() => jest.advanceTimersByTime(20));
		expect(jest.getTimerCount()).toBeGreaterThan(0);
		act(() => root.unmount());
		expect(jest.getTimerCount()).toBe(0);
		on.mock.calls.forEach(([event, listener]) => {
			expect(off).toHaveBeenCalledWith(event, listener);
		});
	} finally {
		jest.useRealTimers();
		delete global.IS_REACT_ACT_ENVIRONMENT;
	}
});
