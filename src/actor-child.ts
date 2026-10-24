import { GENERATING_SELECTOR, MESSAGE_NAME } from "./shared";

class TabThinkingIndicatorChild extends JSWindowActorChild {
    #observer: MutationObserver | null = null;

    public override handleEvent(event: Event): void {
        if (event.type !== "DOMContentLoaded" && event.type !== "pageshow") return;

        const { document, MutationObserver } = this.contentWindow;
        let reported: boolean | null = null;
        let reportedProgress = "";

        const report = (): void => {
            const generating = document.querySelector(GENERATING_SELECTOR) !== null;
            const paragraphs = Array.from(
                document.querySelectorAll('[data-markdown-text-tone="tertiary"] .Paragraph-kKnbIo')
            );
            const progress = generating ? (paragraphs.pop()?.textContent.trim() ?? "") : "";
            if (generating === reported && progress === reportedProgress) return;

            reported = generating;
            reportedProgress = progress;
            this.sendAsyncMessage(MESSAGE_NAME, { generating, progress });
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
}

export { TabThinkingIndicatorChild };
