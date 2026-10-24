// src/frame.ts
const MESSAGE_NAME = "io.roboin.tab-thinking-indicator:generating";
const GENERATING_SELECTOR = "svg.icon-primary-action > path[d^=\"M4.5 5.75C4.5\"]";
const isGenerating = () => content.document.querySelector(GENERATING_SELECTOR) !== null;
const watchState = () => {
	let reported = null;
	const report = () => {
		const generating = isGenerating();
		if (generating === reported) return;
		reported = generating;
		sendAsyncMessage(MESSAGE_NAME, { generating });
	};
	new content.MutationObserver(report).observe(content.document.documentElement, {
		attributes: true,
		childList: true,
		subtree: true
	});
	report();
};
try {
	if (content.location.hostname === "chatgpt.com") watchState();
	else sendAsyncMessage(MESSAGE_NAME, { generating: false });
} catch {
	sendAsyncMessage(MESSAGE_NAME, { generating: false });
}
