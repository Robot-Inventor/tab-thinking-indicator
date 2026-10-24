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
		let reportedProgress = "";
		const report = () => {
			const generating = document.querySelector(GENERATING_SELECTOR) !== null;
			const paragraphs = Array.from(document.querySelectorAll("[data-markdown-text-tone=\"tertiary\"] .Paragraph-kKnbIo"));
			const progress = generating ? paragraphs.pop()?.textContent.trim() ?? "" : "";
			if (generating === reported && progress === reportedProgress) return;
			reported = generating;
			reportedProgress = progress;
			this.sendAsyncMessage(MESSAGE_NAME, {
				generating,
				progress
			});
		};
		this.#observer ??= new MutationObserver(report);
		this.#observer.observe(document.documentElement, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true
		});
		report();
	}
};

export { TabThinkingIndicatorChild };