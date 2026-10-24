// src/background.ts
const MOD_ID = "io.roboin.tab-thinking-indicator";
try {
	ChromeUtils.registerWindowActor("TabThinkingIndicator", {
		child: {
			esModuleURI: `chrome://sine/content/${MOD_ID}/dist/actor-child.sys.mjs`,
			events: {
				DOMContentLoaded: {},
				pageshow: {}
			},
			matches: ["https://chatgpt.com/*"]
		},
		parent: { esModuleURI: `chrome://sine/content/${MOD_ID}/dist/actor-parent.sys.mjs` }
	});
} catch {}
