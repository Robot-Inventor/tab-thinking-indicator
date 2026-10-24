declare const ChromeUtils: {
    registerWindowActor(name: string, options: unknown): void;
};

const MOD_ID = "io.roboin.tab-thinking-indicator";

try {
    ChromeUtils.registerWindowActor("TabThinkingIndicator", {
        child: {
            esModuleURI: `chrome://sine/content/${MOD_ID}/dist/actor-child.sys.mjs`,
            events: {
                DOMContentLoaded: {},
                pageshow: {}
            }
        },
        matches: ["https://chatgpt.com/*"],
        parent: {
            esModuleURI: `chrome://sine/content/${MOD_ID}/dist/actor-parent.sys.mjs`
        },
        safeForUntrustedWebProcess: true
    });
} catch {
    // The actor is already registered when the mod is reloaded.
}
