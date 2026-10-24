// src/shared.ts
const MESSAGE_NAME = "TabThinkingIndicator:generating";
const GENERATING_SELECTOR = "svg.icon-primary-action > path[d^=\"M4.5 5.75C4.5\"]";

// src/actor-child.ts
var TabThinkingIndicatorChild = class extends JSWindowActorChild {
	#observer = null;
	handleEvent(event) {
		if (event.type !== "DOMContentLoaded" && event.type !== "pageshow") return;
		const { document, MutationObserver } = this.contentWindow;
		let reported = null;
		const report = () => {
			const generating = document.querySelector(GENERATING_SELECTOR) !== null;
			if (generating === reported) return;
			reported = generating;
			this.sendAsyncMessage(MESSAGE_NAME, { generating });
		};
		this.#observer ??= new MutationObserver(report);
		this.#observer.observe(document.documentElement, {
			attributes: true,
			childList: true,
			subtree: true
		});
		report();
	}
};

export { TabThinkingIndicatorChild };