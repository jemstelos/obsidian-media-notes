import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

class ClickHandlerPlugin {
	view: EditorView;
	handleTimestampClick: (ts: string) => boolean | undefined;

	constructor(view: EditorView) {
		this.view = view;
		this.view.dom.addEventListener("click", this.handleClick);
	}

	handleClick = (event: MouseEvent) => {
		const element = event.target as HTMLElement;
		if (element.matches("span.cm-link, span.cm-link *")) {
			const textContent = element.textContent;
			const timestampRegex = /^(\d+:)?[0-5]?\d:[0-5]\d$/;
			if (!textContent) return;
			if (timestampRegex.test(textContent)) {
				const isHandled = this.handleTimestampClick(textContent);
				if (isHandled) {
					event.preventDefault();
					event.stopPropagation();
				}
			}
			// Add your custom logic here
		}
	};

	update(update: ViewUpdate) {
		update.view.dom.addEventListener("click", this.handleClick);
		// This method is called whenever the view is updated
	}

	destroy() {
		// This method is called when the plugin is no longer needed
		this.view.dom.removeEventListener("click", this.handleClick);
	}
}

export const clickHandlerPlugin = ViewPlugin.fromClass(ClickHandlerPlugin);

export function createClickHandlerPlugin(
	handleTimestampClick: (ts: string) => boolean | undefined
) {
	return ViewPlugin.fromClass(
		class extends ClickHandlerPlugin {
			constructor(view: EditorView) {
				super(view);
				this.handleTimestampClick = handleTimestampClick;
			}
		}
	);
}
