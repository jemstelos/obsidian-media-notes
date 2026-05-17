import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

class ClickHandlerPlugin {
	view: EditorView;
	handleTimestampClick: (ts: string) => boolean | undefined;
	getTimestampTemplate: () => string;

	constructor(view: EditorView) {
		this.view = view;
		this.view.dom.addEventListener("click", this.handleClick);
	}

	handleClick = (event: MouseEvent) => {
		const element = event.target as HTMLElement;
		if (element.matches("span.cm-link, span.cm-link *")) {
			const textContent = element.textContent;
			if (!textContent) return;

			// Extract template from settings
			const template = this.getTimestampTemplate ? this.getTimestampTemplate() : "[{ts}]({link})";
			const matchBracket = template.match(/\[(.*?)\]/);
			const linkTextTemplate = matchBracket ? matchBracket[1] : "{ts}";
			const parts = linkTextTemplate.split("{ts}");
			const prefix = parts[0] || "";
			const suffix = parts[1] || "";

			// Escape prefix and suffix for regex
			const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const escapedPrefix = escapeRegExp(prefix);
			const escapedSuffix = escapeRegExp(suffix);

			const timestampRegex = new RegExp("^" + escapedPrefix + "((\\d+:)?[0-5]?\\d:[0-5]\\d)" + escapedSuffix + "$");
			const match = textContent.match(timestampRegex);
			if (match) {
				const cleanTimestamp = match[1];
				const isHandled = this.handleTimestampClick(cleanTimestamp);
				if (isHandled) {
					event.preventDefault();
					event.stopPropagation();
				}
			}
		}
	};

	update(update: ViewUpdate) {
		update.view.dom.addEventListener("click", this.handleClick);
	}

	destroy() {
		this.view.dom.removeEventListener("click", this.handleClick);
	}
}

export const clickHandlerPlugin = ViewPlugin.fromClass(ClickHandlerPlugin);

export function createClickHandlerPlugin(
	handleTimestampClick: (ts: string) => boolean | undefined,
	getTimestampTemplate: () => string
) {
	return ViewPlugin.fromClass(
		class extends ClickHandlerPlugin {
			constructor(view: EditorView) {
				super(view);
				this.handleTimestampClick = handleTimestampClick;
				this.getTimestampTemplate = getTimestampTemplate;
			}
		}
	);
}
