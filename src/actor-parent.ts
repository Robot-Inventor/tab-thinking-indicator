import { EVENT_NAME, type GenerationDetail } from "./shared";

class TabThinkingIndicatorParent extends JSWindowActorParent {
    public override receiveMessage(message: { data: { generating: boolean } }): void {
        const browser = this.browsingContext?.top?.embedderElement;
        if (!browser) return;

        const chromeWindow = browser.ownerDocument?.defaultView;
        if (!chromeWindow) return;

        chromeWindow.dispatchEvent(
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
