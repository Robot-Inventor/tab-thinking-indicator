interface ContentWindow extends Window {
    MutationObserver: typeof MutationObserver;
}

declare const content: ContentWindow;
declare const sendAsyncMessage: (name: string, data: unknown) => void;

const MESSAGE_NAME = "io.roboin.tab-thinking-indicator:generating";

const GENERATING_SELECTOR = 'svg.icon-primary-action > path[d^="M4.5 5.75C4.5"]';
const isGenerating = (): boolean => content.document.querySelector(GENERATING_SELECTOR) !== null;

const watchState = (): void => {
    let reported: boolean | null = null;

    const report = (): void => {
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
    if (content.location.hostname === "chatgpt.com") {
        watchState();
    } else {
        sendAsyncMessage(MESSAGE_NAME, { generating: false });
    }
} catch {
    sendAsyncMessage(MESSAGE_NAME, { generating: false });
}
