/* eslint-disable @typescript-eslint/no-var-requires */
/* global document, window */
jest.mock("../main", () => ({ formatTimestamp: (value) => String(value) }));
jest.mock("react-youtube", () => {
	const React = require("react");
	return {
		__esModule: true,
		default: React.forwardRef((props, ref) => {
			mockProps = props;
			React.useImperativeHandle(ref, () => ({
				getInternalPlayer: () => ({ getCurrentTime: () => Promise.resolve(12) }),
			}));
			return React.createElement("iframe", { className: props.iframeClassName });
		}),
	};
});

const React = require("react");
const { act } = require("react-dom/test-utils");
const { createRoot } = require("react-dom/client");
const { MediaFrame, getVideoId } = require("../components/media-frame");
let mockProps;

test("YouTube receives origin and iframe permissions, including replacement iframes", async () => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
	const container = document.createElement("div");
	const root = createRoot(container);
	const disconnect = jest.spyOn(window.MutationObserver.prototype, "disconnect");
	try {
		await act(async () => root.render(React.createElement(MediaFrame, {
			mediaLink: "https://www.youtube.com/watch?v=video",
			ytRef: React.createRef(), initSeconds: 5, autoplay: true,
		})));
		expect(mockProps.opts.playerVars).toMatchObject({
			start: 5, autoplay: 1, origin: window.location.origin,
		});
		const iframe = container.querySelector("iframe");
		expect(iframe.referrerPolicy).toBe("strict-origin-when-cross-origin");
		expect(iframe.allow).toContain("autoplay");
		expect(iframe.allow).toContain("encrypted-media");
		expect(iframe.allowFullscreen).toBe(true);
		const replacement = document.createElement("iframe");
		replacement.className = "youtube-iframe";
		await act(async () => { iframe.replaceWith(replacement); });
		expect(replacement.referrerPolicy).toBe("strict-origin-when-cross-origin");
		expect(replacement.allowFullscreen).toBe(true);
		act(() => root.unmount());
		expect(disconnect).toHaveBeenCalled();
	} finally {
		disconnect.mockRestore();
		delete global.IS_REACT_ACT_ENVIRONMENT;
	}
});

test("repeated play events keep one polling interval and unmount clears it", async () => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
	jest.useFakeTimers();
	const root = createRoot(document.createElement("div"));
	try {
		await act(async () => root.render(React.createElement(MediaFrame, {
			mediaLink: "https://www.youtube.com/watch?v=video",
			ytRef: React.createRef(), initSeconds: 0,
		})));
		await act(async () => { mockProps.onStateChange({ data: 1 }); });
		expect(jest.getTimerCount()).toBe(1);
		await act(async () => { mockProps.onStateChange({ data: 1 }); });
		expect(jest.getTimerCount()).toBe(1);
		await act(async () => { mockProps.onStateChange({ data: 2 }); });
		expect(jest.getTimerCount()).toBe(0);
		await act(async () => { mockProps.onStateChange({ data: 1 }); });
		act(() => root.unmount());
		expect(jest.getTimerCount()).toBe(0);
	} finally {
		jest.useRealTimers();
		delete global.IS_REACT_ACT_ENVIRONMENT;
	}
});

test("invalid links are harmless without adding URL formats handled by another PR", () => {
	expect(getVideoId("not a URL")).toBeNull();
	expect(getVideoId("https://www.youtube.com/watch?v=video")).toBe("video");
	expect(getVideoId("https://youtu.be/video")).toBeNull();
});
