interface ContentWindow extends Window {
    MutationObserver: typeof MutationObserver;
}

declare class JSWindowActorChild {
    public contentWindow: ContentWindow;
    public sendAsyncMessage(name: string, data: unknown): void;
    public handleEvent(event: Event): void;
}
