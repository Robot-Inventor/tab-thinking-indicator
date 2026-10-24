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

export { MESSAGE_NAME, EVENT_NAME, GENERATING_SELECTOR, type BrowserElement, type GenerationDetail };
