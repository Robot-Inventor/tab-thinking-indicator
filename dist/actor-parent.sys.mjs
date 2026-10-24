// src/shared.ts
const EVENT_NAME = "tab-thinking-indicator:generating";

// src/actor-parent.ts
var TabThinkingIndicatorParent = class extends JSWindowActorParent {
	receiveMessage(message) {
		const browser = this.browsingContext?.top?.embedderElement;
		if (!browser) return;
		browser.ownerGlobal.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: {
			browser,
			generating: message.data.generating
		} }));
	}
};

export { TabThinkingIndicatorParent };