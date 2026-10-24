import { EVENT_NAME, type GenerationDetail } from "./shared";

class TabThinkingIndicatorParent extends JSWindowActorParent {
    public override receiveMessage(message: { name: string; data: { generating: boolean } }): void {
        const browser = this.browsingContext?.top?.embedderElement;
        if (!browser) return;

        browser.ownerGlobal.dispatchEvent(
            new CustomEvent<GenerationDetail>(EVENT_NAME, {
                detail: {
                    browser,
                    generating: message.data.generating
                }
            })
        );
    }
}

export { TabThinkingIndicatorParent };
