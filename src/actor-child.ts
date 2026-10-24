import { GENERATING_SELECTOR, MESSAGE_NAME } from "./shared";

class TabThinkingIndicatorChild extends JSWindowActorChild {
    #observer: MutationObserver | null = null;

    public override handleEvent(event: Event): void {
        if (event.type !== "DOMContentLoaded" && event.type !== "pageshow") return;

        const { document, MutationObserver } = this.contentWindow;
        let reported: boolean | null = null;

        const report = (): void => {
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
}

export { TabThinkingIndicatorChild };
