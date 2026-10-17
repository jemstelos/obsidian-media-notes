/* eslint-disable @typescript-eslint/no-var-requires */
const { EventEmitter } = require("../event-emitter");

test("events dispatch payloads and remove only the registered listener", () => {
	const emitter = new EventEmitter();
	const first = jest.fn();
	const second = jest.fn();
	emitter.on("settingsUpdated", first);
	emitter.on("settingsUpdated", second);
	emitter.emit("settingsUpdated", { enabled: true });
	expect(first).toHaveBeenCalledWith({ enabled: true });
	expect(second).toHaveBeenCalledTimes(1);
	emitter.off("settingsUpdated", first);
	emitter.emit("settingsUpdated", { enabled: false });
	expect(first).toHaveBeenCalledTimes(1);
	expect(second).toHaveBeenCalledTimes(2);
	expect(() => emitter.emit("unregistered", null)).not.toThrow();
});
