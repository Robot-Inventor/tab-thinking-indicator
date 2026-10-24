const MESSAGE_NAME = "TabThinkingIndicator:generating";
const EVENT_NAME = "tab-thinking-indicator:generating";
const GENERATING_SELECTOR = 'svg.icon-primary-action > path[d^="M4.5 5.75C4.5"]';

interface BrowserElement {
    ownerDocument?: {
        defaultView?: Window | null;
    };
}

interface GenerationDetail {
    browser: BrowserElement;
    generating: boolean;
    progress: string;
}

interface Tab extends Element {
    linkedBrowser: BrowserElement;
}

interface GBrowser {
    addTabsProgressListener(listener: TabsProgressListener): void;
    removeTabsProgressListener(listener: TabsProgressListener): void;
    getTabForBrowser(browser: BrowserElement): Tab | null;
    selectedTab: Tab;
    tabContainer: Element;
}

interface TabsProgressListener {
    onStateChange(...args: unknown[]): void;
}

export {
    MESSAGE_NAME,
    EVENT_NAME,
    GENERATING_SELECTOR,
    type BrowserElement,
    type GBrowser,
    type GenerationDetail,
    type Tab,
    type TabsProgressListener
};
